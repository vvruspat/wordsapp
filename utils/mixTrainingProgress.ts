import type { LearningTrainingName } from "@/shared/progress/exercises";
import type LearningProgress from "@/db/models/LearningProgress";

export function getIncompleteTrainings(
	wordIds: number[],
	trainingIds: LearningTrainingName[],
	progress: Pick<LearningProgress, "wordId" | "training" | "score">[],
): LearningTrainingName[] {
	const succeeded = new Set(
		progress
			.filter((record) => record.score > 0)
			.map((record) => `${record.wordId}:${record.training}`),
	);
	return trainingIds.filter((trainingId) =>
		wordIds.some((wordId) => !succeeded.has(`${wordId}:${trainingId}`)),
	);
}
