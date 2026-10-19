import { useOperationScope } from "@/shared/lifecycle/useOperationScope";
import { logger } from "@/utils/logger";
import NetInfo from "@react-native-community/netinfo";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type {
	DialogueScenario,
	DialogueSession,
} from "@/features/dialogues/model/types";
import {
	getActiveDialogue,
	getDialogueHistory,
	getDialogueRecommendations,
	startDialogue,
} from "@/features/dialogues/api/dialogues";
import { dialogueCacheRepository } from "@/features/dialogues/services/dialogueCache";
import { useSessionUser } from "@/shared/session/useSession";

export function useDialogues() {
	const router = useRouter();
	const { t } = useTranslation();
	const { user } = useSessionUser();
	const [online, setOnline] = useState(true);
	const [active, setActive] = useState<DialogueSession | null>(null);
	const [history, setHistory] = useState<DialogueSession[]>([]);
	const [scenarios, setScenarios] = useState<DialogueScenario[]>([]);
	const [customTopic, setCustomTopic] = useState("");
	const [loadingScenarios, setLoadingScenarios] = useState(false);
	const [refreshing, setRefreshing] = useState(false);
	const [starting, setStarting] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const loadingRef = useRef(false);
	const startingRef = useRef(false);
	const begin = useOperationScope(
		`${user?.userId}:${user?.language_learn}:${user?.language_speak}`,
	);
	useEffect(() => {
		begin();
		loadingRef.current = false;
		startingRef.current = false;
		setActive(null);
		setHistory([]);
		setScenarios([]);
	}, [begin]);

	useEffect(
		() =>
			NetInfo.addEventListener((state) =>
				setOnline(Boolean(state.isConnected)),
			),
		[],
	);

	const load = useCallback(
		async (showRefreshControl = false) => {
			const current = begin();
			if (!user?.userId || loadingRef.current) return;
			loadingRef.current = true;
			if (showRefreshControl) setRefreshing(true);
			setError(null);
			const cached = await dialogueCacheRepository
				.list(user.userId)
				.catch((reason) => {
					logger.error("Unable to read dialogue list cache", reason, "db");
					return [];
				});
			if (!current()) return;
			const cachedActive =
				cached.find((item) => item.session.status === "active")?.session ??
				null;
			setHistory(cached.map((item) => item.session));
			setActive(cachedActive);
			if (!online) {
				setRefreshing(false);
				loadingRef.current = false;
				return;
			}
			if (!cachedActive) setLoadingScenarios(true);
			try {
				const activeRequest = getActiveDialogue();
				const historyRequest = getDialogueHistory();
				const recommendationsRequest = activeRequest.then((remoteActive) =>
					remoteActive ? null : getDialogueRecommendations(),
				);
				const [remoteActive, remoteHistory, recommendations] =
					await Promise.all([
						activeRequest,
						historyRequest,
						recommendationsRequest,
					]);
				if (!current()) return;
				setActive(remoteActive);
				setHistory(remoteHistory);
				await dialogueCacheRepository.mergeSessions(user.userId, remoteHistory);
				if (!remoteActive) {
					setScenarios(recommendations?.scenarios ?? []);
				} else {
					setScenarios([]);
				}
			} catch (loadError) {
				if (!current()) return;
				setError(
					loadError instanceof Error
						? loadError.message
						: t("dialogue_load_error"),
				);
			} finally {
				if (current()) {
					setLoadingScenarios(false);
					setRefreshing(false);
					loadingRef.current = false;
				}
			}
		},
		[online, t, user?.userId, begin],
	);

	useFocusEffect(useCallback(() => void load(), [load]));

	const start = async (scenario?: DialogueScenario) => {
		if (!user?.userId || !online || active || startingRef.current) return;
		const current = begin();
		const topic = customTopic.trim();
		if (!scenario && !topic) return;
		startingRef.current = true;
		setStarting(scenario?.title ?? topic);
		setError(null);
		try {
			const detail = await startDialogue(
				scenario
					? { title: scenario.title, description: scenario.description }
					: { customTopic: topic },
			);
			if (!current()) return;
			await dialogueCacheRepository.upsert(user.userId, detail);
			if (!current()) return;
			router.push({
				pathname: "/authorized/dialogues/[id]",
				params: { id: detail.session.id },
			});
		} catch (startError) {
			if (!current()) return;
			setError(
				startError instanceof Error
					? startError.message
					: t("dialogue_start_error"),
			);
		} finally {
			if (current()) {
				startingRef.current = false;
				setStarting(null);
			}
		}
	};

	return {
		router,
		t,
		online,
		active,
		history,
		scenarios,
		customTopic,
		setCustomTopic,
		loadingScenarios,
		refreshing,
		starting,
		error,
		load,
		start,
	};
}
