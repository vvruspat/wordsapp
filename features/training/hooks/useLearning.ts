import { logger } from "@/utils/logger";
import { wordSelection } from "@/shared/vocabulary/wordSelection";
import { useTrainingSelection } from "../model/trainingSelection";
import { router } from "expo-router";
import { useCallback, useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { BackgroundContext } from "@/context/BackgroundContext";
import { learningRepository } from "@/db/repositories/learning.repository";
import {
	CHUNK_SIZE,
	useChunkManagement,
} from "@/features/training/hooks/useChunkManagement";
import { useSelectionStore } from "@/shared/selection/selectionStore";
import { useSessionUser } from "@/shared/session/useSession";
import { Colors } from "@/mob-ui/brand/colors";

export function useLearning() {
	const { setColor, setOpacity } = useContext(BackgroundContext);
	const { t } = useTranslation();
	const { user } = useSessionUser();
	const { setChunkWordIds } = useTrainingSelection();
	const { currentCatalogs, currentTopics } = useSelectionStore();

	const userId = user?.userId != null ? String(user.userId) : undefined;
	const {
		shouldShowProposal,
		loading: chunkLoading,
		markProposed,
	} = useChunkManagement(userId, currentTopics, currentCatalogs);

	const [untrainedWords, setUntrainedWords] = useState<{ remoteId: number }[]>(
		[],
	);
	const [proposalDismissed, setProposalDismissed] = useState(false);

	// Load untrained words when conditions might warrant showing proposal
	useEffect(() => {
		if (!user?.userId || !user?.language_learn) return;
		let active = true;
		wordSelection
			.getOrderedUntrainedWords(
				user.language_learn,
				CHUNK_SIZE,
				user.userId,
				currentTopics.length > 0 ? currentTopics : undefined,
				currentCatalogs.length > 0 ? currentCatalogs : undefined,
			)
			.then((words) => {
				if (active) setUntrainedWords(words);
			})
			.catch((reason) =>
				logger.error("Unable to prepare word proposal", reason, "db"),
			);
		return () => {
			active = false;
		};
	}, [user?.userId, user?.language_learn, currentTopics, currentCatalogs]);

	useEffect(() => {
		setColor(Colors.backgrounds.green);
		setOpacity(1);
		return () => {
			setOpacity(0.3);
		};
	}, [setColor, setOpacity]);

	const showProposal =
		!chunkLoading &&
		shouldShowProposal &&
		untrainedWords.length > 0 &&
		!proposalDismissed;

	const handleLearn = useCallback(async () => {
		await markProposed();
		const wordIds = untrainedWords.map((w) => w.remoteId).join(",");
		router.push({
			pathname: "/authorized/learning/word-intro",
			params: { wordIds },
		});
	}, [markProposed, untrainedWords]);

	const handleTrainChunk = useCallback(async () => {
		await markProposed();
		if (!user?.userId) return;
		const allRecords = await learningRepository.getByUser(user.userId);
		const introducedIds = allRecords
			.filter((r) => r.training === "intro")
			.map((r) => r.wordId);
		setChunkWordIds(introducedIds.length > 0 ? introducedIds : null);
		router.push({ pathname: "/authorized/learning/mix-training" });
	}, [markProposed, user?.userId, setChunkWordIds]);

	const handleTrainAll = useCallback(async () => {
		await markProposed();
		setChunkWordIds(null);
		setProposalDismissed(true);
	}, [markProposed, setChunkWordIds]);

	return {
		t,
		setChunkWordIds,
		untrainedWords,
		showProposal,
		handleLearn,
		handleTrainChunk,
		handleTrainAll,
	};
}
