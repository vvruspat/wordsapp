import { wordsRepository } from "@/db/repositories/words.repository";
import { progressService } from "@/shared/progress/progressService";
import { selectWords } from "./selectWords";
export const wordSelection = {
	async getRandomWords(
		language: string,
		count = 1,
		exclude: number[] = [],
		catalogs?: number[],
		topics?: number[],
		userId?: number,
		trainingId?: string,
	) {
		const candidates = await wordsRepository.findCandidates(
			language,
			exclude,
			catalogs,
			topics,
		);
		if (!userId)
			return candidates.sort(() => Math.random() - 0.5).slice(0, count);
		return selectWords(
			candidates,
			await progressService.read(userId),
			count,
			trainingId,
		);
	},
	async getOrderedUntrainedWords(
		language: string,
		count: number,
		userId: number,
		topics?: number[],
		catalogs?: number[],
	) {
		const candidates = await wordsRepository.findCandidates(
			language,
			[],
			catalogs,
			topics,
		);
		const progress = await progressService.read(userId);
		const introduced = new Set(progress.map((record) => record.wordId));
		return candidates
			.filter((word) => !introduced.has(word.remoteId))
			.sort((a, b) => a.remoteId - b.remoteId)
			.slice(0, count);
	},
};
