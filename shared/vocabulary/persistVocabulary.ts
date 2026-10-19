import { Q } from "@nozbe/watermelondb";
import type { components } from "@vvruspat/words-types";
import database from "@/db/database";
import Topic from "@/db/models/Topic";
import VocabCatalog from "@/db/models/VocabCatalog";
import Word from "@/db/models/Word";
import WordTranslation from "@/db/models/WordTranslation";
import WordSynonymGroup from "@/db/models/WordSynonymGroup";
type WordDto = components["schemas"]["WordDto"];
type WordTranslationDto = components["schemas"]["WordTranslationDto"];
type VocabCatalogDto = components["schemas"]["VocabCatalogDto"];
type TopicDto = components["schemas"]["TopicDto"];

export async function persistVocabulary(
	catalogs: VocabCatalogDto[],
	topics: TopicDto[],
	wordsWithKnownAudio: WordDto[],
	translations: WordTranslationDto[],
	synonymGroups: { id: number; language: string; word_ids: number[] }[],
	targetLanguage: string,
	isCurrent: () => boolean,
) {
	if (!isCurrent()) return;
	await database.write(async () => {
		if (!isCurrent()) return;
		// Clear existing data for this language (optional - you might want to keep it)
		// For now, we'll upsert

		// Sync catalogs
		for (const catalog of catalogs) {
			const existing = await database
				.get<VocabCatalog>("vocab_catalogs")
				.query(Q.where("remote_id", catalog.id))
				.fetch();

			if (existing.length > 0) {
				await existing[0].update((c) => {
					c.remoteId = catalog.id;
					c.remoteCreatedAt = catalog.created_at;
					c.owner = Number(catalog.owner);
					c.title = catalog.title;
					c.description = catalog.description ?? null;
					c.language = catalog.language;
					c.image = catalog.image ?? null;
				});
			} else {
				await database.get<VocabCatalog>("vocab_catalogs").create((c) => {
					c.remoteId = catalog.id;
					c.remoteCreatedAt = catalog.created_at;
					c.owner = Number(catalog.owner);
					c.title = catalog.title;
					c.description = catalog.description ?? null;
					c.language = catalog.language;
					c.image = catalog.image ?? null;
				});
			}
		}

		// Sync topics (use remote_id + language as key to support multiple languages)
		for (const topic of topics) {
			const existing = await database
				.get<Topic>("topics")
				.query(
					Q.where("remote_id", topic.id),
					Q.where("language", topic.language),
				)
				.fetch();

			if (existing.length > 0) {
				await existing[0].update((t) => {
					t.remoteId = topic.id;
					t.remoteCreatedAt = topic.created_at;
					t.title = topic.title;
					t.description = topic.description ?? "";
					t.language = topic.language;
					t.image = topic.image ?? null;
				});
			} else {
				await database.get<Topic>("topics").create((t) => {
					t.remoteId = topic.id;
					t.remoteCreatedAt = topic.created_at;
					t.title = topic.title;
					t.description = topic.description ?? "";
					t.language = topic.language;
					t.image = topic.image ?? null;
				});
			}
		}

		// Sync words
		for (const word of wordsWithKnownAudio) {
			const existing = await database
				.get<Word>("words")
				.query(Q.where("remote_id", word.id))
				.fetch();

			if (existing.length > 0) {
				await existing[0].update((w) => {
					w.remoteId = word.id;
					w.remoteCreatedAt = word.created_at;
					w.topic = Number(word.topic);
					w.word = word.word;
					w.catalog = Number(word.catalog);
					w.language = word.language;
					w.audio = word.audio;
					w.transcription = word.transcription;
					w.meaning = word.meaning ?? undefined;
				});
			} else {
				await database.get<Word>("words").create((w) => {
					w.remoteId = word.id;
					w.remoteCreatedAt = word.created_at;
					w.topic = Number(word.topic);
					w.word = word.word;
					w.catalog = Number(word.catalog);
					w.language = word.language;
					w.audio = word.audio;
					w.transcription = word.transcription;
					w.meaning = word.meaning ?? undefined;
				});
			}
		}

		// Sync translations
		for (const translation of translations) {
			const existing = await database
				.get<WordTranslation>("word_translations")
				.query(Q.where("remote_id", translation.id))
				.fetch();

			if (existing.length > 0) {
				await existing[0].update((t) => {
					t.remoteId = translation.id;
					t.remoteCreatedAt = translation.created_at;
					t.word = Number(translation.word);
					t.translation = translation.translation;
					t.language = translation.language;
				});
			} else {
				await database.get<WordTranslation>("word_translations").create((t) => {
					t.remoteId = translation.id;
					t.remoteCreatedAt = translation.created_at;
					t.word = Number(translation.word);
					t.translation = translation.translation;
					t.language = translation.language;
				});
			}
		}

		// Sync synonym groups: clear all groups for this language and replace
		// Only replace if fetch succeeded (synonymGroups would be empty on failure)
		if (synonymGroups.length > 0) {
			const existingSynonymGroups = await database
				.get<WordSynonymGroup>("word_synonym_groups")
				.query(Q.where("language", targetLanguage))
				.fetch();
			for (const existing of existingSynonymGroups) {
				await existing.markAsDeleted();
			}
			for (const group of synonymGroups) {
				await database
					.get<WordSynonymGroup>("word_synonym_groups")
					.create((sg) => {
						sg.remoteId = group.id;
						sg.language = group.language;
						sg.wordIdsJson = JSON.stringify(group.word_ids);
					});
			}
		}
	});
}
