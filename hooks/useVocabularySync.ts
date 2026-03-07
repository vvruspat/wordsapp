import { Q } from "@nozbe/watermelondb";
import { useDatabase } from "@nozbe/watermelondb/hooks";
import NetInfo from "@react-native-community/netinfo";
import { components, Language } from "@vvruspat/words-types";
import * as FileSystem from "expo-file-system/legacy";
import { useCallback } from "react";
import {
	getCatalogs,
	getTopicTranslations,
	getTopics,
	getWords,
	getWordTranslations,
} from "@/api/vocabulary";
import Topic from "@/db/models/Topic";
import VocabCatalog from "@/db/models/VocabCatalog";
import Word from "@/db/models/Word";
import WordTranslation from "@/db/models/WordTranslation";
import { logger } from "@/utils/logger";
import { useSessionUser } from "./useSession";
import { useVocabularyStore } from "./useVocabularyStore";

type WordDto = components["schemas"]["WordDto"];
type WordTranslationDto = components["schemas"]["WordTranslationDto"];
type VocabCatalogDto = components["schemas"]["VocabCatalogDto"];
type TopicDto = components["schemas"]["TopicDto"];
type TopicTranslationDto = components["schemas"]["TopicTranslationDto"];

/**
 * Downloads an audio file from a URL to the local assets/audio directory if it doesn't exist.
 * Returns the local file path.
 */
const downloadAudioFile = async (
	audioUrl: string,
	wordId: number,
): Promise<string> => {
	logger.debug("downloadAudioFile audioUrl", audioUrl, "audio");
	if (!audioUrl) {
		return audioUrl;
	}

	// Check if it's already a local path (starts with file:// or doesn't start with http)
	if (audioUrl.startsWith("file://") || !audioUrl.startsWith("http")) {
		return audioUrl;
	}

	// Get the audio directory path
	if (!FileSystem.documentDirectory) {
		logger.warn("Document directory is not available", undefined, "audio");
		return audioUrl;
	}

	const audioDir = `${FileSystem.documentDirectory}assets/audio/`;

	logger.debug("audioDir", audioDir, "audio");

	// Ensure the directory exists
	const dirInfo = await FileSystem.getInfoAsync(audioDir);
	if (!dirInfo.exists) {
		await FileSystem.makeDirectoryAsync(audioDir, { intermediates: true });
	}

	// Extract filename from URL
	const urlWithoutQuery = audioUrl.split("?")[0]; // Remove query parameters
	const urlPathParts = urlWithoutQuery.split("/");
	const originalFileName =
		urlPathParts[urlPathParts.length - 1] || `audio_${wordId}`;

	// If filename doesn't have extension, add .mp3 as default
	const fileName = originalFileName.includes(".")
		? originalFileName
		: `${originalFileName}.mp3`;

	// Prefix with wordId to ensure uniqueness
	const localPath = `${audioDir}${fileName}`;

	// Check if file already exists
	const fileInfo = await FileSystem.getInfoAsync(localPath);
	if (fileInfo.exists) {
		logger.debug("File already exists", localPath, "audio");
		return localPath;
	}

	// Download the file
	try {
		const downloadResult = await FileSystem.downloadAsync(audioUrl, localPath);
		if (downloadResult.status === 200) {
			logger.debug(`Downloaded audio for word ${wordId}`, localPath, "audio");
			return localPath;
		} else {
			logger.warn(
				`Failed to download audio for word ${wordId}`,
				downloadResult.status,
				"audio",
			);
			return audioUrl; // Return original URL if download fails
		}
	} catch (error) {
		logger.warn(`Error downloading audio for word ${wordId}:`, error, "audio");
		return audioUrl; // Return original URL if download fails
	}
};

export const useVocabularySync = () => {
	const database = useDatabase();
	const { user } = useSessionUser();
	const {
		setWords,
		setTranslations,
		setCatalogs,
		setTopics,
		setTopicTranslations,
		setLanguageLearn,
		setSyncing,
		setSyncProgress,
		setSyncStatus,
		setLastSyncTime,
		setError,
		clearError,
	} = useVocabularyStore();

	const syncVocabulary = useCallback(
		async (languageLearn?: Language) => {
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

			setSyncing(true);
			setSyncProgress(0);
			setSyncStatus("sync_status_catalogs");
			clearError();
			setLanguageLearn(targetLanguage);

			try {
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
				if (user.language_speak && user.language_speak !== targetLanguage && topics.length > 0) {
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
						language: user.language_speak,
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

				logger.debug("Downloading audio files", undefined, "sync");
				setSyncStatus("sync_status_audio");
				setSyncProgress(0.5);

				// Build a map of already-downloaded local audio paths from the DB
				const existingWords = await database
					.get<Word>("words")
					.query(Q.where("language", targetLanguage))
					.fetch();
				const existingAudioMap = new Map<number, string>(
					existingWords
						.filter((w) => w.audio && !w.audio.startsWith("http"))
						.map((w) => [w.remoteId, w.audio]),
				);

				// Download audio files only for words that don't have a local path yet
				const audioCandidates = words.filter(
					(word) => word.audio && !existingAudioMap.has(word.id),
				);
				const audioCount = audioCandidates.length;
				let audioCompleted = 0;

				const wordsWithLocalAudio = await Promise.all(
					words.map(async (word) => {
						if (word.audio) {
							const existingLocal = existingAudioMap.get(word.id);
							if (existingLocal) {
								return { ...word, audio: existingLocal };
							}
							const localAudioPath = await downloadAudioFile(
								word.audio,
								word.id,
							);
							if (audioCount > 0) {
								audioCompleted += 1;
								const audioProgress = 0.5 + (audioCompleted / audioCount) * 0.3;
								setSyncProgress(audioProgress);
							}
							return { ...word, audio: localAudioPath };
						}
						return word;
					}),
				);
				if (audioCount === 0) {
					setSyncProgress(0.8);
				}

				logger.debug("Storing in local database", undefined, "db");
				setSyncStatus("sync_status_saving");
				setSyncProgress(0.85);
				// Store in local database
				await database.write(async () => {
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
							.query(Q.where("remote_id", topic.id), Q.where("language", topic.language))
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
					for (const word of wordsWithLocalAudio) {
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
							await database
								.get<WordTranslation>("word_translations")
								.create((t) => {
									t.remoteId = translation.id;
									t.remoteCreatedAt = translation.created_at;
									t.word = Number(translation.word);
									t.translation = translation.translation;
									t.language = translation.language;
								});
						}
					}
				});

				// Update Zustand store
				setCatalogs(catalogs);
				setTopics(topics);
				setTopicTranslations(topicTranslations);
				setWords(wordsWithLocalAudio);
				setTranslations(translations);
				setLastSyncTime(Date.now());

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
				}
				setSyncing(false);
			}
		},
		[
			user,
			database,
			setWords,
			setTranslations,
			setCatalogs,
			setTopics,
			setTopicTranslations,
			setLanguageLearn,
			setSyncing,
			setSyncProgress,
			setSyncStatus,
			setLastSyncTime,
			setError,
			clearError,
		],
	);

	const loadFromLocal = useCallback(async () => {
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
	}, [database, setWords, setTranslations, setCatalogs, setTopics, setError]);

	return {
		syncVocabulary,
		loadFromLocal,
	};
};
