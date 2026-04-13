import LearningProgress from "@/db/models/LearningProgress";
import Word from "@/db/models/Word";
import EXERCISES_APPS from "@/components/LearningCatalog/types";

export type TopicProgressStats = {
	total: number;
	learned: number;
	greenScore: number;
	yellowScore: number;
};

const TRAININGS_COUNT = Object.keys(EXERCISES_APPS).length;

export function buildTopicProgressStats(
	words: Pick<Word, "remoteId" | "topic">[],
	progressRecords: Pick<
		LearningProgress,
		"wordId" | "training" | "score" | "lastReview"
	>[],
): Map<number, TopicProgressStats> {
	const stats = new Map<number, TopicProgressStats>();

	if (words.length === 0) {
		return stats;
	}

	const validTrainingIds = new Set(Object.keys(EXERCISES_APPS));
	const wordIds = new Set(words.map((word) => word.remoteId));
	const bestProgressByWordTraining = new Map<
		string,
		Pick<LearningProgress, "score" | "lastReview">
	>();

	for (const record of progressRecords) {
		if (!record.training || !validTrainingIds.has(record.training)) {
			continue;
		}

		if (!wordIds.has(record.wordId)) {
			continue;
		}

		const key = `${record.wordId}:${record.training}`;
		const existing = bestProgressByWordTraining.get(key);

		if (
			!existing ||
			record.score > existing.score ||
			new Date(record.lastReview).getTime() > new Date(existing.lastReview).getTime()
		) {
			bestProgressByWordTraining.set(key, {
				score: record.score,
				lastReview: record.lastReview,
			});
		}
	}

	const threeMonthsAgo = new Date();
	threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

	for (const word of words) {
		let wordGreenScore = 0;
		let wordYellowScore = 0;

		for (const trainingId of validTrainingIds) {
			const record = bestProgressByWordTraining.get(`${word.remoteId}:${trainingId}`);

			if (!record || record.score <= 0) {
				continue;
			}

			// Topic completion is based on coverage across trainings:
			// one completed training contributes one full training slot,
			// regardless of how many repeated successes were needed inside it.
			const normalizedTrainingCoverage = 1 / TRAININGS_COUNT;
			const lastReview = new Date(record.lastReview);

			if (lastReview >= threeMonthsAgo) {
				wordGreenScore += normalizedTrainingCoverage;
			} else {
				wordYellowScore += normalizedTrainingCoverage;
			}
		}

		const clampedGreenScore = Math.min(wordGreenScore, 1);
		const clampedYellowScore = Math.min(wordYellowScore, 1 - clampedGreenScore);
		const wordTotalScore = clampedGreenScore + clampedYellowScore;

		const entry = stats.get(word.topic) ?? {
			total: 0,
			learned: 0,
			greenScore: 0,
			yellowScore: 0,
		};

		entry.total += 1;
		entry.greenScore += clampedGreenScore;
		entry.yellowScore += clampedYellowScore;

		if (wordTotalScore >= 0.999) {
			entry.learned += 1;
		}

		stats.set(word.topic, entry);
	}

	return stats;
}
