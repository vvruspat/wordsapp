// taskRepository.ts

import { Q } from "@nozbe/watermelondb";
import { Word as WordRemote } from "@vvruspat/words-types";
import database from "../database";
import LearningProgress from "../models/LearningProgress";
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

	async getRandomWord(
		language: string,
		exclude: Word["remoteId"][] = [],
		catalogs?: number[],
		topics?: number[],
	): Promise<Word> {
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
		catalogs?: number[],
		topics?: number[],
		userId?: number,
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
		const candidates = await database
			.get<Word>("words")
			.query(...queryConditions)
			.fetch();

		if (!userId) {
			return candidates.sort(() => Math.random() - 0.5).slice(0, count);
		}

		const progressRecords = await database
			.get<LearningProgress>("learning_progress")
			.query(Q.where("user_id", userId))
			.fetch();

		const progressByWordId = new Map(progressRecords.map((r) => [r.wordId, r]));

		const oneMonthAgo = new Date();
		oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

		const untrained: Word[] = [];
		const stale: Word[] = [];
		const recent: Word[] = [];

		for (const word of candidates) {
			const progress = progressByWordId.get(word.remoteId);
			if (!progress) {
				untrained.push(word);
			} else if (new Date(progress.lastReview) < oneMonthAgo) {
				stale.push(word);
			} else {
				recent.push(word);
			}
		}

		// Sort stale by last_review ascending (oldest first)
		stale.sort(
			(a, b) =>
				new Date(progressByWordId.get(a.remoteId)?.lastReview ?? 0).getTime() -
				new Date(progressByWordId.get(b.remoteId)?.lastReview ?? 0).getTime(),
		);

		// Shuffle untrained and recent
		untrained.sort(() => Math.random() - 0.5);
		recent.sort(() => Math.random() - 0.5);

		return [...untrained, ...stale, ...recent].slice(0, count);
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

	async getByTopicIds(topicIds: number[], catalogIds?: number[]): Promise<Word[]> {
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
