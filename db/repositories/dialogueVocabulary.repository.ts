import { Q } from "@nozbe/watermelondb";
import type { VocabularyResult } from "@/api/dialogues";
import database from "../database";
import LearningProgress from "../models/LearningProgress";
import Word from "../models/Word";
import WordTranslation from "../models/WordTranslation";

export const dialogueVocabularyRepository = {
	async integrate(userId: number, results: VocabularyResult[]) {
		for (const result of results) {
			await database.write(async () => {
				const localWords = await database
					.get<Word>("words")
					.query(Q.where("remote_id", result.word.id))
					.fetch();
				if (localWords[0]) {
					await localWords[0].update((word) => {
						word.word = result.word.word;
						word.topic = result.word.topic;
						word.catalog = result.word.catalog;
						word.language = result.word.language;
						word.audio = result.word.audio ?? "";
						word.transcription = result.word.transcription ?? "";
						word.meaning = result.word.meaning;
					});
				} else {
					await database.get<Word>("words").create((word) => {
						word.remoteId = result.word.id;
						word.remoteCreatedAt = result.word.created_at;
						word.word = result.word.word;
						word.topic = result.word.topic;
						word.catalog = result.word.catalog;
						word.language = result.word.language;
						word.audio = result.word.audio ?? "";
						word.transcription = result.word.transcription ?? "";
						word.meaning = result.word.meaning;
					});
				}

				const localTranslations = await database
					.get<WordTranslation>("word_translations")
					.query(Q.where("remote_id", result.translation.id))
					.fetch();
				if (!localTranslations[0]) {
					await database
						.get<WordTranslation>("word_translations")
						.create((translation) => {
							translation.remoteId = result.translation.id;
							translation.remoteCreatedAt = result.translation.created_at;
							translation.word = result.translation.word;
							translation.translation = result.translation.translation;
							translation.language = result.translation.language;
						});
				}

				for (const progress of [
					result.progress.intro,
					result.progress.writing,
				].filter((item): item is NonNullable<typeof item> => Boolean(item))) {
					const rows = await database
						.get<LearningProgress>("learning_progress")
						.query(
							Q.where("user_id", userId),
							Q.where("word_id", progress.word),
							Q.where("training", progress.training),
						)
						.fetch();
					if (rows[0]) {
						await rows[0].update((row) => {
							row.remoteId = progress.id;
							row.score = progress.score;
							row.lastReview = progress.last_review;
							row.translation = progress.translation;
						});
					} else {
						await database
							.get<LearningProgress>("learning_progress")
							.create((row) => {
								row.remoteId = progress.id;
								row.userId = userId;
								row.wordId = progress.word;
								row.score = progress.score;
								row.lastReview = progress.last_review;
								row.createdAtRemote = progress.created_at;
								row.training = progress.training;
								row.translation = progress.translation;
							});
					}
				}
			});
		}
	},
};
