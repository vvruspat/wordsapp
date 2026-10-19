import { useCallback, useEffect, useRef, useState } from "react";
import NetInfo from "@react-native-community/netinfo";
import { useTranslation } from "react-i18next";
import { useSessionUser } from "@/hooks/useSession";
import { useOperationScope } from "@/shared/lifecycle/useOperationScope";
import type { DialogueDetail } from "../model/types";
import { completeDialogue, getDialogueDetail } from "../api/dialogues";
import { dialogueCacheRepository } from "../services/dialogueCache";
import { logger } from "@/utils/logger";
export function useDialogueDetail(id: string) {
	const { user } = useSessionUser();
	const { t } = useTranslation();
	const [detail, setDetail] = useState<DialogueDetail | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [finishing, setFinishing] = useState(false);
	const finishingRef = useRef(false);
	const begin = useOperationScope(`${user?.userId}:${id}`);
	const revision = useRef(0);
	const onDetailChange = useCallback((next: DialogueDetail) => {
		revision.current++;
		setDetail(next);
	}, []);
	const load = useCallback(async () => {
		const current = begin();
		const version = revision.current;
		if (!id || !user?.userId) return;
		setError(null);
		let cached: DialogueDetail | null = null;
		try {
			cached = await dialogueCacheRepository.get(user.userId, id);
		} catch (reason) {
			logger.error("Unable to read dialogue cache", reason, "db");
		}
		if (!current()) return;
		if (cached && version === revision.current) setDetail(cached);
		try {
			const network = await NetInfo.fetch();
			if (!current()) return;
			if (!network.isConnected) {
				if (!cached) setError(t("dialogue_load_error"));
				return;
			}
			const remote = await getDialogueDetail(id);
			if (!current() || version !== revision.current) return;
			setDetail(remote);
			await dialogueCacheRepository.upsert(user.userId, remote);
		} catch (reason) {
			if (current() && !cached)
				setError(
					reason instanceof Error ? reason.message : t("dialogue_load_error"),
				);
		}
	}, [begin, id, user?.userId, t]);
	useEffect(() => {
		setDetail(null);
		setError(null);
		finishingRef.current = false;
		setFinishing(false);
		void load();
	}, [load]);
	const finish = async () => {
		if (!detail || !user?.userId || finishingRef.current) return;
		const current = begin();
		finishingRef.current = true;
		setFinishing(true);
		try {
			const session = await completeDialogue(detail.session.id);
			if (!current()) return;
			const next = { ...detail, session };
			onDetailChange(next);
			await dialogueCacheRepository.upsert(user.userId, next);
		} catch (reason) {
			if (current())
				setError(
					reason instanceof Error ? reason.message : t("dialogue_finish_error"),
				);
		} finally {
			if (current()) {
				finishingRef.current = false;
				setFinishing(false);
			}
		}
	};
	return {
		dismissError: () => setError(null),
		userId: user?.userId,
		detail,
		onDetailChange,
		error,
		finishing,
		finish,
		load,
	};
}
