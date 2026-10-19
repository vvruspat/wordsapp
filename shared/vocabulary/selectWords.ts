import type Word from "@/db/models/Word";
import type LearningProgress from "@/db/models/LearningProgress";
// Pure priority policy; storage retrieves candidates, callers choose the policy.
export function selectWords(
	candidates: Word[],
	progressRecords: LearningProgress[],
	count: number,
	trainingId?: string,
) {
	const progressByWordId = new Map<number, LearningProgress[]>();

	for (const record of progressRecords) {
		const wordProgress = progressByWordId.get(record.wordId) ?? [];
		wordProgress.push(record);
		progressByWordId.set(record.wordId, wordProgress);
	}

	// Priority 1: no record at all (never trained, or previously failed and deleted)
	// Priority 2: has a record but for a different exercise (not done in this training yet)
	// Priority 3: has a record for the current training — fallback, oldest lastReview first
	const untrained: Word[] = [];
	const otherTraining: Word[] = [];
	const thisTraining: Word[] = [];

	for (const word of candidates) {
		const progressRecordsForWord = progressByWordId.get(word.remoteId) ?? [];
		const currentTrainingProgress = progressRecordsForWord.find(
			(record) => record.training === trainingId,
		);

		if (progressRecordsForWord.length === 0) {
			untrained.push(word);
		} else if (!currentTrainingProgress) {
			otherTraining.push(word);
		} else {
			thisTraining.push(word);
		}
	}

	untrained.sort(() => Math.random() - 0.5);
	otherTraining.sort(() => Math.random() - 0.5);
	thisTraining.sort(
		(a, b) =>
			new Date(
				progressByWordId
					.get(a.remoteId)
					?.find((record) => record.training === trainingId)?.lastReview ?? 0,
			).getTime() -
			new Date(
				progressByWordId
					.get(b.remoteId)
					?.find((record) => record.training === trainingId)?.lastReview ?? 0,
			).getTime(),
	);

	return [...untrained, ...otherTraining, ...thisTraining].slice(0, count);
}
