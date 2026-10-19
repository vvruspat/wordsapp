import { learningRepository } from "@/db/repositories/learning.repository";
import { getIncompleteTrainings } from "@/utils/mixTrainingProgress";
import type { LearningTrainingName } from "./exercises";
const writes = new Map<string, Promise<unknown>>();
async function record(
	params: Parameters<typeof learningRepository.recordResult>[0],
) {
	const key = JSON.stringify([params.userId, params.wordId, params.trainingId]);
	const previous = writes.get(key) ?? Promise.resolve();
	const request = previous
		.catch(() => {})
		.then(() => learningRepository.recordResult(params));
	writes.set(key, request);
	try {
		return await request;
	} finally {
		if (writes.get(key) === request) writes.delete(key);
	}
}
export const progressService = {
	read: learningRepository.getByUser,
	readTraining: learningRepository.getByUserAndTraining,
	readWords: learningRepository.getByUserAndWordIds,
	record,
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
