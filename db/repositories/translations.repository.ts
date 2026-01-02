import { Q } from "@nozbe/watermelondb";
import { WordTranslation as WordTranslationRemote } from "@repo/types";
import database from "../database";
import WordTranslation from "../models/WordTranslation";

const translations =
	database.collections.get<WordTranslation>("word_translations");

export const translationsRepository = {
	async create(translationData: Partial<WordTranslationRemote>) {
		await database.write(async () => {
			await translations.create((translation) => {
				if (translationData.id) {
					translation.remoteId = translationData.id;
				}
				if (translationData.created_at) {
					translation.remoteCreatedAt = translationData.created_at;
				}
				if (translationData.word) {
					translation.word = translationData.word;
				}
				if (translationData.translation) {
					translation.translation = translationData.translation;
				}
				if (translationData.language) {
					translation.language = translationData.language;
				}

				return translation;
			});
		});
	},

	async update(translationData: Partial<WordTranslation>) {
		if (!translationData.id) {
			throw new Error("Translation id is required for update.");
		}
		await database.write(async () => {
			const translation = await translations.find(translationData.id as string);
			if (!translation) {
				throw new Error(`Translation with id ${translationData.id} not found.`);
			}
			await translation.update((t) => {
				if (translationData.word !== undefined) t.word = translationData.word;
				if (translationData.translation !== undefined)
					t.translation = translationData.translation;
				if (translationData.language !== undefined)
					t.language = translationData.language;
			});
		});
	},

	async delete(id: string) {
		await database.write(async () => {
			const translation = await translations.find(id);
			if (translation) {
				await translation.markAsDeleted();
			}
		});
		return translations.query().observe();
	},

	async getByWordId(
		language: string,
		wordId: number,
	): Promise<WordTranslation[]> {
		const queryConditions = [Q.where("word", wordId)];

		if (language) {
			queryConditions.push(Q.where("language", language));
		}

		const results = await database
			.get<WordTranslation>("word_translations")
			.query(...queryConditions)
			.fetch();

		return results;
	},

	async getByWordIds(
		language: string,
		wordIds: number[],
	): Promise<WordTranslation[]> {
		const queryConditions = [Q.where("word", Q.oneOf(wordIds))];

		if (language) {
			queryConditions.push(Q.where("language", language));
		}

		const results = await database
			.get<WordTranslation>("word_translations")
			.query(...queryConditions)
			.fetch();

		return results;
	},

	async getRandomTranslation(
		language: string,
		exclude: WordTranslation["remoteId"][] = [],
	): Promise<WordTranslation> {
		const queryConditions = [Q.where("language", language)];

		if (exclude.length > 0) {
			queryConditions.push(Q.where("remote_id", Q.notIn(exclude)));
		}
		const translations = await database
			.get<WordTranslation>("word_translations")
			.query(...queryConditions)
			.fetch();
		return translations[Math.floor(Math.random() * translations.length)];
	},

	async getRandomTranslations(
		language: string,
		count: number = 1,
		exclude: WordTranslation["remoteId"][] = [],
	): Promise<WordTranslation[]> {
		const queryConditions = [Q.where("language", language)];

		if (exclude.length > 0) {
			queryConditions.push(Q.where("remote_id", Q.notIn(exclude)));
		}
		const translations = await database
			.get<WordTranslation>("word_translations")
			.query(...queryConditions)
			.fetch();
		return translations.sort(() => Math.random() - 0.5).slice(0, count);
	},
};
