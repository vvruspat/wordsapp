import { useTrainingSelection } from "../model/trainingSelection";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { MIX_TRAINING_WORD_LIMIT } from "@/constants/training";
import { mixTrainingRepository } from "@/features/training/services/mixedWordSelection";
import { useSelectionStore } from "@/shared/selection/selectionStore";
import { useSessionUser } from "@/shared/session/useSession";
import { logger } from "@/utils/logger";

const parseWordIds = (raw: string) =>
	[
		...new Set(
			raw
				.split(",")
				.map(Number)
				.filter((id) => Number.isInteger(id) && id > 0),
		),
	].slice(0, MIX_TRAINING_WORD_LIMIT);

export function useMixedPreparation() {
	const { t } = useTranslation();
	const { wordIds } = useLocalSearchParams<{ wordIds?: string }>();
	const { user } = useSessionUser();
	const hasHydrated = useSelectionStore((state) => state._hasHydrated);
	const currentCatalogs = useSelectionStore((state) => state.currentCatalogs);
	const currentTopics = useSelectionStore((state) => state.currentTopics);
	const setChunkWordIds = useTrainingSelection(
		(state) => state.setChunkWordIds,
	);
	const [ready, setReady] = useState(false);
	const [hasWords, setHasWords] = useState(true);

	useEffect(() => {
		if (
			!hasHydrated ||
			!user?.userId ||
			!user.language_learn ||
			!user.language_speak
		) {
			return;
		}

		const chunkIds = useTrainingSelection.getState().chunkWordIds;
		if (!wordIds && chunkIds?.length) {
			const selectedIds = [...new Set(chunkIds)].slice(
				0,
				MIX_TRAINING_WORD_LIMIT,
			);
			setChunkWordIds(selectedIds);
			setHasWords(selectedIds.length > 0);
			setReady(true);
			return;
		}

		let active = true;
		const newWordIds = wordIds ? parseWordIds(wordIds) : [];
		setReady(false);
		const selection = wordIds
			? mixTrainingRepository.getDialogueWordIds({
					newWordIds,
					userId: user.userId,
					learningLanguage: user.language_learn,
					nativeLanguage: user.language_speak,
					selectedCatalogIds: currentCatalogs,
				})
			: mixTrainingRepository.getDefaultWordIds({
					learningLanguage: user.language_learn,
					nativeLanguage: user.language_speak,
					selectedCatalogIds: currentCatalogs,
					selectedTopicIds: currentTopics,
				});
		selection
			.then((selectedIds) => {
				if (!active) return;
				setChunkWordIds(selectedIds);
				setHasWords(selectedIds.length > 0);
				setReady(true);
			})
			.catch((error) => {
				if (!active) return;
				logger.error("Failed to prepare mix training words", error, "db");
				setChunkWordIds(newWordIds);
				setHasWords(newWordIds.length > 0);
				setReady(true);
			});

		return () => {
			active = false;
		};
	}, [
		hasHydrated,
		wordIds,
		user?.userId,
		user?.language_learn,
		user?.language_speak,
		currentCatalogs,
		currentTopics,
		setChunkWordIds,
	]);

	return { t, ready, hasWords };
}
