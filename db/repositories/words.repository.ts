// taskRepository.ts

import { Q } from "@nozbe/watermelondb";
import { Word as WordRemote } from "@vvruspat/words-types";
import database from "../database";
import VocabCatalog from "../models/VocabCatalog";
import Word from "../models/Word";

const words = database.collections.get<Word>("words");

export const wordsRepository = {
	async create(wordData: Partial<WordRemote>) {
		await database.write(async () => {
			await words.create((word) => {
				if (wordData.id) {
					word.remoteId = wordData.id;
				}
				if (wordData.topic) {
					word.topic = wordData.topic;
				}
				if (wordData.word) {
					word.word = wordData.word;
				}
				if (wordData.created_at) {
					word.remoteCreatedAt = wordData.created_at;
				}
				if (wordData.catalog) {
					word.catalog = wordData.catalog;
				}
				if (wordData.language) {
					word.language = wordData.language;
				}
				if (wordData.audio) {
					word.audio = wordData.audio;
				}
				if (wordData.transcription) {
					word.transcription = wordData.transcription;
				}
				if (wordData.meaning) {
					word.meaning = wordData.meaning;
				}

				return word;
			});
		});
	},

	async update(wordData: Partial<Word>) {
		if (!wordData.id) {
			throw new Error("Word id is required for update.");
		}
		await database.write(async () => {
			const word = await words.find(wordData.id as string);
			if (!word) {
				throw new Error(`Word with id ${wordData.id} not found.`);
			}
			await word.update((w) => {
				if (wordData.topic !== undefined) w.topic = wordData.topic;
				if (wordData.catalog !== undefined) w.catalog = wordData.catalog;
				if (wordData.language !== undefined) w.language = wordData.language;
				if (wordData.audio !== undefined) w.audio = wordData.audio;
				if (wordData.transcription !== undefined)
					w.transcription = wordData.transcription;
				if (wordData.meaning !== undefined) w.meaning = wordData.meaning;
			});
		});
	},

	async delete(id: string) {
		await database.write(async () => {
			const word = await words.find(id);
			if (word) {
				await word.markAsDeleted();
			}
		});
		return words.query().observe();
	},
	async findCandidates(
		language: string,
		exclude: number[] = [],
		catalogs?: number[],
		topics?: number[],
	): Promise<Word[]> {
		const queryConditions = [Q.where("language", language)];
		if (catalogs && catalogs.length > 0) {
			queryConditions.push(Q.where("catalog", Q.oneOf(catalogs)));
		}
		if (topics && topics.length > 0) {
			queryConditions.push(Q.where("topic", Q.oneOf(topics)));
		}
		if (exclude.length > 0) {
			queryConditions.push(Q.where("remote_id", Q.notIn(exclude)));
		}
		return database
			.get<Word>("words")
			.query(...queryConditions)
			.fetch();
	},

	async getTopicsByCatalogs(
		catalogs: VocabCatalog["remoteId"][],
	): Promise<Set<Word["topic"]>> {
		if (catalogs.length === 0) return new Set();
		const words = await database
			.get<Word>("words")
			.query(Q.where("catalog", Q.oneOf(catalogs)))
			.fetch();
		return new Set(words.map((word) => word.topic));
	},

	async getByRemoteIds(remoteIds: number[], language: string): Promise<Word[]> {
		if (remoteIds.length === 0) return [];
		return database
			.get<Word>("words")
			.query(
				Q.where("remote_id", Q.oneOf(remoteIds)),
				Q.where("language", language),
			)
			.fetch();
	},

	async getByTopicIds(
		topicIds: number[],
		catalogIds?: number[],
	): Promise<Word[]> {
		if (topicIds.length === 0) return [];
		const conditions = [Q.where("topic", Q.oneOf(topicIds))];
		if (catalogIds && catalogIds.length > 0) {
			conditions.push(Q.where("catalog", Q.oneOf(catalogIds)));
		}
		return database
			.get<Word>("words")
			.query(...conditions)
			.fetch();
	},
};
