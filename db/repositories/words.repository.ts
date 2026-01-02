// taskRepository.ts

import { Q } from "@nozbe/watermelondb";
import { Word as WordRemote } from "@repo/types";
import database from "../database";
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
				if (wordData.transcribtion) {
					word.transcribtion = wordData.transcribtion;
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
				if (wordData.transcribtion !== undefined)
					w.transcribtion = wordData.transcribtion;
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

	async getRandomWord(
		language: string,
		exclude: Word["remoteId"][] = [],
		catalog?: number,
		topic?: number,
	): Promise<Word> {
		const queryConditions = [Q.where("language", language)];

		if (catalog) {
			queryConditions.push(Q.where("catalog", catalog));
		}

		if (topic) {
			queryConditions.push(Q.where("topic", topic));
		}

		if (exclude.length > 0) {
			queryConditions.push(Q.where("remote_id", Q.notIn(exclude)));
		}

		const words = await database
			.get<Word>("words")
			.query(...queryConditions)
			.fetch();

		if (words.length === 0) {
			throw new Error("No words found matching the current filters");
		}

		const randomWord = words[Math.floor(Math.random() * words.length)];

		return randomWord;
	},

	async getRandomWords(
		language: string,
		count: number = 1,
		exclude: Word["remoteId"][] = [],
		catalog?: number,
		topic?: number,
	): Promise<Word[]> {
		const queryConditions = [Q.where("language", language)];
		if (catalog) {
			queryConditions.push(Q.where("catalog", catalog));
		}
		if (topic) {
			queryConditions.push(Q.where("topic", topic));
		}
		if (exclude.length > 0) {
			queryConditions.push(Q.where("remote_id", Q.notIn(exclude)));
		}
		const words = await database
			.get<Word>("words")
			.query(...queryConditions)
			.fetch();
		const randomWords = words.sort(() => Math.random() - 0.5).slice(0, count);

		return randomWords;
	},
};
