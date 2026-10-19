import { wordsRepository } from "@/db/repositories/words.repository";
import { translationsRepository } from "@/db/repositories/translations.repository";
import { synonymGroupsRepository } from "@/db/repositories/synonymGroups.repository";
import type Word from "@/db/models/Word";
import type WordTranslation from "@/db/models/WordTranslation";
export type WordPair = { word: Word; translation: WordTranslation };
export const wordsService = {
	async pairs(words: Word[], language: string): Promise<WordPair[]> {
		const translations = await translationsRepository.getByWordIds(
			language,
			words.map((word) => word.remoteId),
		);
		return words.flatMap((word) => {
			const translation = translations.find(
				(item) => item.word === word.remoteId,
			);
			return translation ? [{ word, translation }] : [];
		});
	},
	async acceptedTranslations(
		wordId: number,
		wordLanguage: string,
		language: string,
	) {
		const ids = await synonymGroupsRepository.getSynonymWordIds(
			wordId,
			wordLanguage,
		);
		const translations = await translationsRepository.getByWordIds(
			language,
			ids,
		);
		return translations.map((item) => item.translation);
	},
	async acceptedWords(
		wordId: number,
		language: string,
		translation: string,
		translationLanguage: string,
	) {
		const ids = await synonymGroupsRepository.getSynonymWordIds(
			wordId,
			language,
		);
		const matches = await translationsRepository.getByTranslationText(
			translation,
			translationLanguage,
		);
		const words = await wordsRepository.getByRemoteIds(
			[...new Set([...ids, ...matches.map((item) => item.word)])],
			language,
		);
		return words.map((item) => item.word);
	},
};
