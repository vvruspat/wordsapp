import { Q } from "@nozbe/watermelondb";
import NetInfo from "@react-native-community/netinfo";
import { components, Language } from "@vvruspat/words-types";
import {
	getCatalogs,
	getSynonymGroups,
	getTopics,
	getTopicTranslations,
	getWords,
	getWordTranslations,
} from "@/api/vocabulary";
import Topic from "@/db/models/Topic";
import VocabCatalog from "@/db/models/VocabCatalog";
import Word from "@/db/models/Word";
import WordTranslation from "@/db/models/WordTranslation";
import { isRemoteAudioPath } from "@/utils/audio";
import { logger } from "@/utils/logger";
import { useVocabularyStore } from "@/hooks/useVocabularyStore";
import database from "@/db/database";
import type User from "@/db/models/User";

import {
	createAudioDownloader,
	cancelVocabularyAudio,
} from "@/shared/audio/vocabularyAudio";
import { persistVocabulary } from "./persistVocabulary";
type WordDto = components["schemas"]["WordDto"];
type WordTranslationDto = components["schemas"]["WordTranslationDto"];
type VocabCatalogDto = components["schemas"]["VocabCatalogDto"];
type TopicDto = components["schemas"]["TopicDto"];
type TopicTranslationDto = components["schemas"]["TopicTranslationDto"];

let epoch = 0;
const inFlight = new Map<string, Promise<void>>();
export function invalidateVocabularyOperations() {
	epoch++;
	inFlight.clear();
	cancelVocabularyAudio();
}
function guardedActions(isCurrent: () => boolean) {
	const state = useVocabularyStore.getState();
	return {
		setWords: (value: Parameters<typeof state.setWords>[0]) => {
			if (isCurrent()) state.setWords(value);
		},
		setTranslations: (value: Parameters<typeof state.setTranslations>[0]) => {
			if (isCurrent()) state.setTranslations(value);
		},
		setCatalogs: (value: Parameters<typeof state.setCatalogs>[0]) => {
			if (isCurrent()) state.setCatalogs(value);
		},
		setTopics: (value: Parameters<typeof state.setTopics>[0]) => {
			if (isCurrent()) state.setTopics(value);
		},
		setTopicTranslations: (
			value: Parameters<typeof state.setTopicTranslations>[0],
		) => {
			if (isCurrent()) state.setTopicTranslations(value);
		},
		setLanguageLearn: (value: Parameters<typeof state.setLanguageLearn>[0]) => {
			if (isCurrent()) state.setLanguageLearn(value);
		},
		setSyncing: (value: Parameters<typeof state.setSyncing>[0]) => {
			if (isCurrent()) state.setSyncing(value);
		},
		setBackgroundSync: (
			value: Parameters<typeof state.setBackgroundSync>[0],
		) => {
			if (isCurrent()) state.setBackgroundSync(value);
		},
		setSyncProgress: (value: Parameters<typeof state.setSyncProgress>[0]) => {
			if (isCurrent()) state.setSyncProgress(value);
		},
		setSyncStatus: (value: Parameters<typeof state.setSyncStatus>[0]) => {
			if (isCurrent()) state.setSyncStatus(value);
		},
		setLastSyncTime: (value: Parameters<typeof state.setLastSyncTime>[0]) => {
			if (isCurrent()) state.setLastSyncTime(value);
		},
		setError: (value: Parameters<typeof state.setError>[0]) => {
			if (isCurrent()) state.setError(value);
		},
		setAudioDownloadState: (
			value: Parameters<typeof state.setAudioDownloadState>[0],
		) => {
			if (isCurrent()) state.setAudioDownloadState(value);
		},
		clearError: () => {
			if (isCurrent()) state.clearError();
		},
	};
}
export function createVocabularyOperations(user: User | null) {
	const generation = epoch;
	const language = user?.language_learn;
	const isCurrent = () =>
		generation === epoch && user?.language_learn === language;
	const {
		setWords,
		setTranslations,
		setCatalogs,
		setTopics,
		setTopicTranslations,
		setLanguageLearn,
		setSyncing,
		setBackgroundSync,
		setSyncProgress,
		setSyncStatus,
		setLastSyncTime,
		setError,
		clearError,
		setAudioDownloadState,
	} = guardedActions(isCurrent);

	const downloadMissingAudio = createAudioDownloader(user, isCurrent);
	const syncVocabulary = async (languageLearn?: Language) => {
		let didSucceed = false;

		const netState = await NetInfo.fetch();
		if (!netState.isConnected) return;

		if (!user) {
			setError("User not authenticated");
			return;
		}

		// Get language_learn from parameter, user model, or API
		const targetLanguage = languageLearn;

		logger.debug(
			"targetLanguage",
			{
				language_learn: user.language_learn,
				language_speak: user.language_speak,
			},
			"sync",
		);

		if (!targetLanguage) {
			setError("Language to learn is required");
			return;
		}

		try {
			// Show the app while cached vocabulary is refreshed.
			const [localWordCount, localCatalogCount] = await Promise.all([
				database
					.get<Word>("words")
					.query(Q.where("language", targetLanguage))
					.fetchCount(),
				database
					.get<VocabCatalog>("vocab_catalogs")
					.query(Q.where("language", targetLanguage))
					.fetchCount(),
			]);
			setBackgroundSync(localWordCount > 0 || localCatalogCount > 0);
			setSyncing(true);
			setSyncProgress(0);
			setSyncStatus("sync_status_catalogs");
			clearError();
			setLanguageLearn(targetLanguage);

			logger.debug("Fetching catalogs", undefined, "sync");
			// Fetch catalogs filtered by language
			const catalogsResponse = await getCatalogs({
				offset: 0,
				limit: 1000,
				language: targetLanguage,
			});

			if (catalogsResponse.status === "error") {
				setError(
					`Failed to fetch catalogs: ${catalogsResponse.error?.message}`,
				);
				return;
			}
			setSyncProgress(0.1);

			logger.debug("Catalogs fetched", catalogsResponse.data, "sync");
			const catalogs: VocabCatalogDto[] = catalogsResponse.data?.items || [];

			logger.debug("Fetching topics", undefined, "sync");
			setSyncStatus("sync_status_topics");
			const topicsResponse = await getTopics({
				offset: 0,
				limit: 10000,
				language: targetLanguage,
			});

			logger.debug("Topics fetched", topicsResponse.data, "sync");

			if (topicsResponse.status === "error") {
				setError(`Failed to fetch topics: ${topicsResponse.error?.message}`);
				return;
			}
			setSyncProgress(0.2);

			const topics: TopicDto[] = topicsResponse.data?.items || [];

			// Fetch topic name translations for the native language
			let topicTranslations: TopicTranslationDto[] = [];
			if (
				user.language_speak &&
				user.language_speak !== targetLanguage &&
				topics.length > 0
			) {
				try {
					const topicTranslationsResponse = await getTopicTranslations({
						offset: 0,
						limit: 10000,
						language: user.language_speak as Language,
						topics: topics.map((t) => t.id).join(","),
					});
					if (
						topicTranslationsResponse.status === "success" &&
						topicTranslationsResponse.data?.items
					) {
						topicTranslations = topicTranslationsResponse.data.items;
					}
				} catch (error) {
					logger.warn("Failed to fetch topic translations:", error, "sync");
				}
			}

			// Fetch words filtered by language
			setSyncStatus("sync_status_words");
			const wordsResponse = await getWords({
				offset: 0,
				limit: 10000,
				language: targetLanguage,
			});

			if (wordsResponse.status === "error") {
				setError(`Failed to fetch words: ${wordsResponse.error?.message}`);
				return;
			}
			setSyncProgress(0.35);

			const words: WordDto[] = wordsResponse.data?.items || [];

			// Fetch translations for the words
			// Note: API only supports fetching by word ID, so we fetch individually
			// In a production app, you might want to batch these requests or cache them
			const translations: WordTranslationDto[] = [];

			setSyncStatus("sync_status_translations");
			try {
				// Fetch translations for each word (API limitation - no bulk endpoint)
				const translationResponse = await getWordTranslations({
					words: words.map((w) => w.id).join(","),
					offset: 0,
					limit: 100000,
					language: user.language_speak as Language,
				});

				if (
					translationResponse.status === "success" &&
					translationResponse.data
				) {
					// The response is GetWordTranslationResponseDto which has items array
					if (translationResponse.data.items) {
						translations.push(...translationResponse.data.items);
					}
				}
				setSyncProgress(0.45);
			} catch (error) {
				logger.warn("Failed to fetch translation for words:", error, "sync");
				// Continue with other words even if one fails
			}

			logger.debug("Translations fetched", translations, "sync");

			// Build a map of already-downloaded local audio paths from the DB
			const existingWords = await database
				.get<Word>("words")
				.query(Q.where("language", targetLanguage))
				.fetch();
			const existingAudioMap = new Map<number, string>(
				existingWords
					.filter((w) => w.audio && !isRemoteAudioPath(w.audio))
					.map((w) => [w.remoteId, w.audio]),
			);

			const wordsWithKnownAudio: typeof words = words.map((word) => {
				const existingLocal = existingAudioMap.get(word.id);
				return existingLocal ? { ...word, audio: existingLocal } : word;
			});

			setSyncProgress(0.6);

			// Fetch synonym groups for validation (best-effort, non-blocking)
			let synonymGroups: {
				id: number;
				language: string;
				word_ids: number[];
			}[] = [];
			try {
				const synonymGroupsResponse = await getSynonymGroups(targetLanguage);
				if (
					synonymGroupsResponse.status === "success" &&
					synonymGroupsResponse.data
				) {
					synonymGroups =
						synonymGroupsResponse.data as unknown as typeof synonymGroups;
				}
			} catch (error) {
				logger.warn("Failed to fetch synonym groups:", error, "sync");
			}

			logger.debug("Storing in local database", undefined, "db");
			setSyncStatus("sync_status_saving");
			setSyncProgress(0.85);
			// Store in local database
			await persistVocabulary(
				catalogs,
				topics,
				wordsWithKnownAudio,
				translations,
				synonymGroups,
				targetLanguage,
				isCurrent,
			);
			if (!isCurrent()) return;
			// Update Zustand store
			setCatalogs(catalogs);
			setTopics(topics);
			setTopicTranslations(topicTranslations);
			setWords(wordsWithKnownAudio);
			setTranslations(translations);
			setLastSyncTime(Date.now());

			void downloadMissingAudio(targetLanguage);

			setSyncProgress(1);
			setSyncStatus(null);
			didSucceed = true;
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error occurred";
			setError(`Sync failed: ${errorMessage}`);
		} finally {
			if (!didSucceed) {
				setSyncProgress(0);
				setAudioDownloadState({
					isAudioDownloading: false,
					audioDownloadProgress: 0,
					audioDownloadCompleted: 0,
					audioDownloadTotal: 0,
				});
			}
			setSyncing(false);
		}
	};
	const loadFromLocal = async () => {
		const { languageLearn } = useVocabularyStore.getState();

		if (!languageLearn) {
			return;
		}

		try {
			// Load from local database
			const catalogs = await database
				.get<VocabCatalog>("vocab_catalogs")
				.query(Q.where("language", languageLearn))
				.fetch();

			const catalogIds = catalogs.map((c) => c.remoteId);
			const topics =
				catalogIds.length > 0
					? await database
							.get<Topic>("topics")
							.query(Q.where("catalog", Q.oneOf(catalogIds.map(String))))
							.fetch()
					: [];

			const words = await database
				.get<Word>("words")
				.query(Q.where("language", languageLearn))
				.fetch();

			const wordIds = words.map((w) => w.remoteId);
			const translations =
				wordIds.length > 0
					? await database
							.get<WordTranslation>("word_translations")
							.query(Q.where("word", Q.oneOf(wordIds)))
							.fetch()
					: [];

			// Convert to DTO format
			setCatalogs(
				catalogs.map((c) => ({
					id: c.remoteId,
					created_at: c.remoteCreatedAt,
					owner: c.owner,
					title: c.title,
					description: c.description ?? null,
					language: c.language,
					image: c.image ?? null,
				})),
			);

			setTopics(
				topics.map((t) => ({
					id: t.remoteId,
					created_at: t.remoteCreatedAt,
					title: t.title,
					description: t.description ?? "",
					language: t.language,
					image: t.image ?? null,
				})),
			);

			setWords(
				words.map((w) => ({
					status: "processed",
					id: w.remoteId,
					created_at: w.remoteCreatedAt,
					topic: w.topic,
					word: w.word,
					catalog: w.catalog,
					language: w.language as Language,
					audio: w.audio,
					transcription: w.transcription,
					meaning: w.meaning,
				})),
			);

			setTranslations(
				translations.map((t) => ({
					id: t.remoteId,
					created_at: t.remoteCreatedAt,
					word: t.word,
					translation: t.translation,
					language: t.language,
				})),
			);
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error occurred";
			setError(`Failed to load from local database: ${errorMessage}`);
		}
	};
	return {
		downloadMissingAudio,
		loadFromLocal,
		syncVocabulary: (language?: Language) => {
			if (!isCurrent()) return Promise.resolve();
			const key = JSON.stringify([
				generation,
				user?.userId,
				user?.language_speak,
				language,
			]);
			const existing = inFlight.get(key);
			if (existing) return existing;
			const request = syncVocabulary(language).finally(() => {
				if (inFlight.get(key) === request) inFlight.delete(key);
			});
			inFlight.set(key, request);
			return request;
		},
	};
}
