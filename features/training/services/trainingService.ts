import { wordsRepository } from "@/db/repositories/words.repository";
import { wordsService } from "@/shared/vocabulary/wordsService";
import { progressService } from "@/shared/progress/progressService";
import { translationsRepository } from "@/db/repositories/translations.repository";
import { MIX_TRAINING_WORD_LIMIT } from "@/constants/training";
import { TRAINING_IDS } from "@/shared/progress/exercises";
import { TrainingSession } from "../model/session";
export type TrainingConditions = {
	userId?: number;
	learningLanguage: string;
	nativeLanguage: string;
	catalogs: number[];
	topics: number[];
	mode: "mixed" | "single";
	wordIds: number[] | null;
	trainingIds?: import("@/shared/progress/exercises").ExerciseId[];
};
export const trainingService = {
	async prepare(conditions: TrainingConditions) {
		const {
			userId,
			learningLanguage,
			nativeLanguage,
			catalogs,
			topics,
			mode,
			wordIds,
		} = conditions;
		const ids =
			mode === "mixed"
				? [...new Set(wordIds ?? [])].slice(0, MIX_TRAINING_WORD_LIMIT)
				: null;
		const words = ids
			? await wordsRepository.getByRemoteIds(ids, learningLanguage)
			: await wordsRepository.getRandomWords(
					learningLanguage,
					999999,
					[],
					catalogs.length ? catalogs : undefined,
					topics.length ? topics : undefined,
				);
		const pairs = await wordsService.pairs(words, nativeLanguage);
		const ordered = ids
			? ids.flatMap((id) => pairs.filter((pair) => pair.word.remoteId === id))
			: pairs;
		const progress = userId
			? await progressService.readWords(
					userId,
					ordered.map((pair) => pair.word.remoteId),
				)
			: [];
		return {
			pairs: ordered,
			session: new TrainingSession(
				ordered.map((pair) => pair.word.remoteId),
				conditions.trainingIds ?? (mode === "mixed" ? [...TRAINING_IDS] : []),
				progress,
			),
		};
	},
	async distractors(
		conditions: TrainingConditions,
		pairs: Awaited<ReturnType<typeof wordsService.pairs>>,
		wordCount: number,
		translationCount: number,
	) {
		const { learningLanguage, nativeLanguage, catalogs, topics } = conditions;
		// Optional distractors can fail independently without dropping the main task.
		const [words, translations] = await Promise.allSettled([
			wordCount
				? wordsRepository.getRandomWords(
						learningLanguage,
						wordCount,
						pairs.map((p) => p.word.remoteId),
						catalogs.length ? catalogs : undefined,
						topics.length ? topics : undefined,
					)
				: Promise.resolve([]),
			translationsRepository.getRandomTranslations(
				nativeLanguage,
				translationCount,
				pairs.map((p) => p.translation.remoteId),
				topics.length ? topics : undefined,
				catalogs.length ? catalogs : undefined,
				pairs.map((p) => p.word.remoteId),
			),
		]);
		return {
			words: words.status === "fulfilled" ? words.value : [],
			translations:
				translations.status === "fulfilled" ? translations.value : [],
		};
	},
};
