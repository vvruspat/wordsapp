import NetInfo from "@react-native-community/netinfo";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type {
	DialogueDetail,
	ExplanationBranch,
} from "@/features/dialogues/model/types";
import { openCorrectionBranch } from "@/features/dialogues/api/dialogues";
import { dialogueCacheRepository } from "@/features/dialogues/services/dialogueCache";
import { useSessionUser } from "@/shared/session/useSession";
import { logger } from "@/utils/logger";

// Effect restarts must share the request that creates the explanation thread.
const pendingBranches = new Map<string, Promise<ExplanationBranch>>();
const loadRemoteBranch = (userId: number, correctionId: string) => {
	const key = `${userId}:${correctionId}`;
	const existing = pendingBranches.get(key);
	if (existing) return existing;
	const request = openCorrectionBranch(correctionId).finally(() => {
		pendingBranches.delete(key);
	});
	pendingBranches.set(key, request);
	return request;
};

const hasMessages = (branch: ExplanationBranch) =>
	branch.messages.some(
		(message) => message.role !== "system" && message.content.trim(),
	);

export function useCorrectionBranch() {
	const { correctionId } = useLocalSearchParams<{ correctionId: string }>();
	const router = useRouter();
	const { t } = useTranslation();
	const { user } = useSessionUser();
	const [branch, setBranch] = useState<ExplanationBranch | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loadAttempt, setLoadAttempt] = useState(0);

	// biome-ignore lint/correctness/useExhaustiveDependencies: loadAttempt explicitly retries a failed load
	useEffect(() => {
		if (!correctionId || !user?.userId) return;
		let cancelled = false;
		setBranch(null);
		setError(null);
		const load = async () => {
			let usableCache = false;
			try {
				const cachedItems = await dialogueCacheRepository
					.list(user.userId)
					.catch((cacheError) => {
						logger.error("Failed to read correction cache", cacheError, "db");
						return [];
					});
				if (cancelled) return;
				const cached = cachedItems.find((detail) =>
					detail.corrections.some((item) => item.id === correctionId),
				);
				const correction = cached?.corrections.find(
					(item) => item.id === correctionId,
				);
				const thread = cached?.threads.find(
					(item) => item.correction_id === correctionId,
				);
				if (cached && correction && thread) {
					const cachedBranch = {
						correction,
						thread,
						messages: cached.messages.filter(
							(item) => item.thread_id === thread.id,
						),
					};
					usableCache = hasMessages(cachedBranch);
					if (usableCache) setBranch(cachedBranch);
				}
				const network = await NetInfo.fetch();
				if (cancelled) return;
				if (!network.isConnected) {
					if (!usableCache) setError(t("dialogue_branch_not_cached"));
					return;
				}
				const remote = await loadRemoteBranch(user.userId, correctionId);
				if (cancelled) return;
				if (!hasMessages(remote)) throw new Error(t("dialogue_branch_error"));
				setBranch(remote);
				const base =
					(await dialogueCacheRepository.get(
						user.userId,
						remote.correction.session_id,
					)) ?? cached;
				if (base) {
					const next: DialogueDetail = {
						...base,
						threads: [
							...base.threads.filter((item) => item.id !== remote.thread.id),
							remote.thread,
						],
						messages: [
							...base.messages.filter(
								(item) => item.thread_id !== remote.thread.id,
							),
							...remote.messages,
						],
						corrections: [
							...base.corrections.filter(
								(item) => item.id !== remote.correction.id,
							),
							remote.correction,
						],
					};
					await dialogueCacheRepository.upsert(user.userId, next);
				}
			} catch (loadError) {
				if (!cancelled && !usableCache)
					setError(
						loadError instanceof Error
							? loadError.message
							: t("dialogue_branch_error"),
					);
			}
		};
		void load();
		return () => {
			cancelled = true;
		};
	}, [correctionId, t, user?.userId, loadAttempt]);

	return { router, t, user, branch, setBranch, error, setLoadAttempt };
}
