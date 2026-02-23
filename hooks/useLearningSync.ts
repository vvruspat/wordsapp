import { learningRepository } from "@/db/repositories/learning.repository";
import { $fetch } from "@/utils/fetch";
import { useCallback } from "react";
import { useSessionUser } from "./useSession";

export const useLearningSync = () => {
	const { user } = useSessionUser();

	const syncToBackend = useCallback(async () => {
		if (!user) return;

		const unsynced = await learningRepository.getUnsynced();

		for (const record of unsynced) {
			// Backend requires training and translation — skip records missing them
			if (!record.training || !record.translation) continue;

			const result = await $fetch("/learning", "post", {
				body: {
					user: user.userId,
					word: record.wordId,
					score: record.score,
					last_review: record.lastReview,
					created_at: record.createdAtRemote,
					training: record.training,
					translation: record.translation,
				},
			});

			if (result.status === "success" && result.data?.id) {
				await learningRepository.markSynced(record.id, result.data.id);
			}
		}
	}, [user]);

	const syncFromBackend = useCallback(async () => {
		if (!user) return;

		const result = await $fetch("/learning", "get", {
			query: {
				user: user.userId,
				offset: 0,
				limit: 10000,
			},
		});

		if (result.status !== "success" || !result.data?.items) return;

		for (const item of result.data.items) {
			await learningRepository.upsertFromRemote({
				userId: item.user,
				wordId: item.word,
				score: item.score,
				translationId: item.translation,
				trainingId: item.training,
				remoteId: item.id,
				createdAt: item.created_at,
			});
		}
	}, [user]);

	const sync = useCallback(async () => {
		await syncToBackend();
		await syncFromBackend();
	}, [syncToBackend, syncFromBackend]);

	return { sync, syncToBackend, syncFromBackend };
};
