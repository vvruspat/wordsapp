import { learningRepository } from "@/db/repositories/learning.repository";
import { getIncompleteTrainings } from "@/utils/mixTrainingProgress";
import type { LearningTrainingName } from "./exercises";
// A failed write remains rejected. Consumers may retry the same event; successful
// delivery is remembered only for that event, never for a word across steps.
export function createResultWriter<T>(write: (input: T) => Promise<unknown>) {
	const pending = new Map<string, Promise<unknown>>();
	return (eventId: string, input: T) => {
		const existing = pending.get(eventId);
		if (existing) return existing;
		const result = write(input).catch((error) => {
			pending.delete(eventId);
			throw error;
		});
		pending.set(eventId, result);
		return result;
	};
}
export const progressService = {
	read: learningRepository.getByUser,
	readTraining: learningRepository.getByUserAndTraining,
	readWords: learningRepository.getByUserAndWordIds,
	record: learningRepository.recordResult,
	async incomplete(
		userId: number,
		wordIds: number[],
		ids: LearningTrainingName[],
	) {
		return getIncompleteTrainings(
			wordIds,
			ids,
			await learningRepository.getByUserAndWordIds(userId, wordIds),
		);
	},
};
