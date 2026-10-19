import { Q } from "@nozbe/watermelondb";
import { useDatabase } from "@nozbe/watermelondb/hooks";
import { combineLatest } from "rxjs";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import LearningProgress from "@/db/models/LearningProgress";
import Word from "@/db/models/Word";
import { useAudioReadiness } from "@/shared/audio/useAudioReadiness";
import { useSelectionStore } from "@/shared/selection/selectionStore";
import { useSessionUser } from "@/shared/session/useSession";
import {
	EXERCISES_APPS,
	LearningTrainingName,
} from "@/shared/training/presentation";

type TrainingCardStats = {
	successCount: number;
	totalCount: number;
};

type TrainingCardStatsMap = Record<LearningTrainingName, TrainingCardStats>;

function createEmptyTrainingStats(
	totalCount: number = 0,
): TrainingCardStatsMap {
	return {
		cards: { successCount: 0, totalCount },
		true_or_false: { successCount: 0, totalCount },
		choose_translation: { successCount: 0, totalCount },
		type_word: { successCount: 0, totalCount },
		match_words: { successCount: 0, totalCount },
		listening_practice: { successCount: 0, totalCount },
	};
}

export function useTrainingCatalogStats() {
	const { t } = useTranslation();
	const database = useDatabase();
	const { user } = useSessionUser();
	const { currentCatalogs, currentTopics } = useSelectionStore();
	const { isAudioReady, isAudioReadinessLoading } = useAudioReadiness();
	const [trainingStats, setTrainingStats] = useState<TrainingCardStatsMap>(
		createEmptyTrainingStats(),
	);
	useEffect(() => {
		if (!user?.language_learn) {
			setTrainingStats(createEmptyTrainingStats());
			return;
		}

		const wordConditions = [Q.where("language", user.language_learn)];

		if (currentCatalogs.length > 0) {
			wordConditions.push(Q.where("catalog", Q.oneOf(currentCatalogs)));
		}

		if (currentTopics.length > 0) {
			wordConditions.push(Q.where("topic", Q.oneOf(currentTopics)));
		}

		const wordsQuery = database.get<Word>("words").query(...wordConditions);
		const progressQuery =
			user.userId != null
				? database
						.get<LearningProgress>("learning_progress")
						.query(Q.where("user_id", user.userId))
				: null;

		const buildStats = (
			words: Word[],
			progressRecords: LearningProgress[] = [],
		): TrainingCardStatsMap => {
			const availableWordIds = new Set(words.map((word) => word.remoteId));
			const nextStats = createEmptyTrainingStats(availableWordIds.size);
			const learnedWordIdsByTraining = Object.fromEntries(
				Object.keys(EXERCISES_APPS).map((trainingId) => [
					trainingId,
					new Set<number>(),
				]),
			) as Record<LearningTrainingName, Set<number>>;

			for (const progressRecord of progressRecords) {
				if (!progressRecord.training || !(progressRecord.score > 0)) {
					continue;
				}

				const trainingId = progressRecord.training as LearningTrainingName;

				if (!(trainingId in EXERCISES_APPS)) {
					continue;
				}

				if (!availableWordIds.has(progressRecord.wordId)) {
					continue;
				}

				learnedWordIdsByTraining[trainingId].add(progressRecord.wordId);
			}

			for (const trainingId of Object.keys(
				learnedWordIdsByTraining,
			) as LearningTrainingName[]) {
				nextStats[trainingId].successCount =
					learnedWordIdsByTraining[trainingId].size;
			}

			return nextStats;
		};

		const subscription = progressQuery
			? combineLatest([
					wordsQuery.observe(),
					progressQuery.observeWithColumns([
						"score",
						"training",
						"last_review",
					]),
				]).subscribe(([words, progressRecords]) => {
					setTrainingStats(buildStats(words, progressRecords));
				})
			: wordsQuery.observe().subscribe((words) => {
					setTrainingStats(buildStats(words));
				});

		return () => {
			subscription.unsubscribe();
		};
	}, [
		currentCatalogs,
		currentTopics,
		database,
		user?.language_learn,
		user?.userId,
	]);

	return { t, isAudioReady, isAudioReadinessLoading, trainingStats };
}
