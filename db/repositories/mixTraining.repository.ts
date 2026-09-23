import { Q } from "@nozbe/watermelondb";
import { MIX_TRAINING_WORD_LIMIT } from "@/constants/training";
import { shuffleArray } from "@/utils";
import database from "../database";
import VocabCatalog from "../models/VocabCatalog";
import Word from "../models/Word";
import WordTranslation from "../models/WordTranslation";

export const mixTrainingRepository = {
	async getDefaultWordIds({
		learningLanguage,
		nativeLanguage,
		selectedCatalogIds,
		selectedTopicIds,
	}: {
		learningLanguage: string;
		nativeLanguage: string;
		selectedCatalogIds: number[];
		selectedTopicIds: number[];
	}): Promise<number[]> {
		const conditions = [Q.where("language", learningLanguage)];
		if (selectedCatalogIds.length > 0) {
			conditions.push(Q.where("catalog", Q.oneOf(selectedCatalogIds)));
		}
		if (selectedTopicIds.length > 0) {
			conditions.push(Q.where("topic", Q.oneOf(selectedTopicIds)));
		}

		const [words, translations] = await Promise.all([
			database
				.get<Word>("words")
				.query(...conditions)
				.fetch(),
			database
				.get<WordTranslation>("word_translations")
				.query(Q.where("language", nativeLanguage))
				.fetch(),
		]);
		const translatedWordIds = new Set(
			translations.map((translation) => translation.word),
		);
		const eligibleWords = new Map(
			words
				.filter((word) => translatedWordIds.has(word.remoteId))
				.map((word) => [word.remoteId, word]),
		);
		return shuffleArray([...eligibleWords.values()])
			.slice(0, MIX_TRAINING_WORD_LIMIT)
			.map((word) => word.remoteId);
	},

	async getDialogueWordIds({
		newWordIds,
		userId,
		learningLanguage,
		nativeLanguage,
		selectedCatalogIds,
	}: {
		newWordIds: number[];
		userId: number;
		learningLanguage: string;
		nativeLanguage: string;
		selectedCatalogIds: number[];
	}): Promise<number[]> {
		const [words, translations, personalCatalogs] = await Promise.all([
			database
				.get<Word>("words")
				.query(Q.where("language", learningLanguage))
				.fetch(),
			database
				.get<WordTranslation>("word_translations")
				.query(Q.where("language", nativeLanguage))
				.fetch(),
			database
				.get<VocabCatalog>("vocab_catalogs")
				.query(Q.where("owner", userId), Q.where("language", learningLanguage))
				.fetch(),
		]);

		const translatedWordIds = new Set(
			translations.map((translation) => translation.word),
		);
		const eligibleWords = words.filter((word) =>
			translatedWordIds.has(word.remoteId),
		);
		const eligibleById = new Map(
			eligibleWords.map((word) => [word.remoteId, word]),
		);
		const personalCatalogIds = new Set(
			personalCatalogs.map((catalog) => catalog.remoteId),
		);
		const selectedCatalogIdSet = new Set(selectedCatalogIds);
		const selectedIds: number[] = [];
		const seen = new Set<number>();
		const add = (wordId: number) => {
			if (
				selectedIds.length >= MIX_TRAINING_WORD_LIMIT ||
				seen.has(wordId) ||
				!eligibleById.has(wordId)
			) {
				return;
			}
			seen.add(wordId);
			selectedIds.push(wordId);
		};

		// Keep dialogue words first, then fill from the user's own and selected catalogs.
		newWordIds.forEach(add);
		const shuffledWords = shuffleArray(eligibleWords);
		for (const word of shuffledWords) {
			if (personalCatalogIds.has(word.catalog)) add(word.remoteId);
		}
		for (const word of shuffledWords) {
			if (selectedCatalogIdSet.has(word.catalog)) add(word.remoteId);
		}
		for (const word of shuffledWords) add(word.remoteId);

		return selectedIds;
	},
};
