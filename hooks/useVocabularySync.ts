import Topic from "@/models/Topic";
import VocabCatalog from "@/models/VocabCatalog";
import Word from "@/models/Word";
import WordTranslation from "@/models/WordTranslation";
import { $fetch } from "@/utils/fetch";
import { Q } from "@nozbe/watermelondb";
import { useDatabase } from "@nozbe/watermelondb/hooks";
import { components, Language } from "@repo/types";
import * as FileSystem from "expo-file-system/legacy";
import { useCallback } from "react";
import { useSessionUser } from "./useSession";
import { useVocabularyStore } from "./useVocabularyStore";

type WordDto = components["schemas"]["WordDto"];
type WordTranslationDto = components["schemas"]["WordTranslationDto"];
type VocabCatalogDto = components["schemas"]["VocabCatalogDto"];
type TopicDto = components["schemas"]["TopicDto"];

/**
 * Downloads an audio file from a URL to the local assets/audio directory if it doesn't exist.
 * Returns the local file path.
 */
const downloadAudioFile = async (
	audioUrl: string,
	wordId: number,
): Promise<string> => {
	console.log("downloadAudioFile audioUrl", audioUrl);
	if (!audioUrl) {
		return audioUrl;
	}

	// Check if it's already a local path (starts with file:// or doesn't start with http)
	if (audioUrl.startsWith("file://") || !audioUrl.startsWith("http")) {
		return audioUrl;
	}

	// Get the audio directory path
	if (!FileSystem.documentDirectory) {
		console.warn("Document directory is not available");
		return audioUrl;
	}

	const audioDir = `${FileSystem.documentDirectory}assets/audio/`;

	console.log("audioDir", audioDir);

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
		console.log("File already exists", localPath);
		return localPath;
	}

	// Download the file
	try {
		const downloadResult = await FileSystem.downloadAsync(audioUrl, localPath);
		if (downloadResult.status === 200) {
			console.log(`Downloaded audio for word ${wordId} to ${localPath}`);
			return fileName;
		} else {
			console.warn(
				`Failed to download audio for word ${wordId}: ${downloadResult.status}`,
			);
			return audioUrl; // Return original URL if download fails
		}
	} catch (error) {
		console.warn(`Error downloading audio for word ${wordId}:`, error);
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
		setLanguageLearn,
		setSyncing,
		setLastSyncTime,
		setError,
		clearError,
	} = useVocabularyStore();

	const syncVocabulary = useCallback(
		async (languageLearn?: Language) => {
			if (!user) {
				setError("User not authenticated");
				return;
			}

			// Get language_learn from parameter, user model, or API
			const targetLanguage = languageLearn;

			console.log(
				"targetLanguage",
				user,
				user.language_learn,
				user.language_speak,
			);

			if (!targetLanguage) {
				setError("Language to learn is required");
				return;
			}

			setSyncing(true);
			clearError();
			setLanguageLearn(targetLanguage);

			try {
				console.log("Fetching catalogs");
				// Fetch catalogs filtered by language
				const catalogsResponse = await $fetch("/vocabcatalog", "get", {
					query: {
						offset: 0,
						limit: 1000,
						language: targetLanguage,
					},
				});

				if (catalogsResponse.status === "error") {
					setError(
						`Failed to fetch catalogs: ${catalogsResponse.error?.message}`,
					);
					setSyncing(false);
					return;
				}

				console.log("Catalogs fetched", catalogsResponse.data);
				const catalogs: VocabCatalogDto[] = catalogsResponse.data?.items || [];

				console.log("Fetching topics");
				const topicsResponse = await $fetch("/topic", "get", {
					query: {
						offset: 0,
						limit: 10000,
						language: targetLanguage,
					},
				});

				console.log("Topics fetched", topicsResponse.data);

				if (topicsResponse.status === "error") {
					setError(`Failed to fetch topics: ${topicsResponse.error?.message}`);
					setSyncing(false);
					return;
				}

				const topics: TopicDto[] = topicsResponse.data?.items || [];

				// Fetch words filtered by language
				const wordsResponse = await $fetch("/word", "get", {
					query: {
						offset: 0,
						limit: 10000,
						language: targetLanguage,
					},
				});

				if (wordsResponse.status === "error") {
					setError(`Failed to fetch words: ${wordsResponse.error?.message}`);
					setSyncing(false);
					return;
				}

				const words: WordDto[] = wordsResponse.data?.items || [];

				// Fetch translations for the words
				// Note: API only supports fetching by word ID, so we fetch individually
				// In a production app, you might want to batch these requests or cache them
				const translations: WordTranslationDto[] = [];

				try {
					// Fetch translations for each word (API limitation - no bulk endpoint)
					const translationResponse = await $fetch(
						"/words-translation",
						"get",
						{
							query: {
								words: words.join(","),
								offset: 0,
								limit: 100000,
								language: user.language_speak,
							},
						},
					);

					if (
						translationResponse.status === "success" &&
						translationResponse.data
					) {
						// The response is GetWordTranslationResponseDto which has items array
						if (translationResponse.data.items) {
							translations.push(...translationResponse.data.items);
						}
					}
				} catch (error) {
					console.warn(`Failed to fetch translation for words:`, error);
					// Continue with other words even if one fails
				}

				console.log("Translations fetched", translations);

				console.log("Downloading audio files");
				// Download audio files for words that have audio URLs
				const wordsWithLocalAudio = await Promise.all(
					words.map(async (word) => {
						if (word.audio) {
							const localAudioPath = await downloadAudioFile(
								word.audio,
								word.id,
							);
							return { ...word, audio: localAudioPath };
						}
						return word;
					}),
				);

				console.log("Storing in local database");
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

					// Sync topics
					for (const topic of topics) {
						const existing = await database
							.get<Topic>("topics")
							.query(Q.where("remote_id", topic.id))
							.fetch();

						if (existing.length > 0) {
							await existing[0].update((t) => {
								t.remoteId = topic.id;
								t.remoteCreatedAt = topic.created_at;
								t.title = topic.title;
								t.description = topic.description ?? "";
								t.image = topic.image ?? null;
							});
						} else {
							await database.get<Topic>("topics").create((t) => {
								t.remoteId = topic.id;
								t.remoteCreatedAt = topic.created_at;
								t.title = topic.title;
								t.description = topic.description ?? "";
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
								w.transcribtion = word.transcribtion;
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
								w.transcribtion = word.transcribtion;
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
				setWords(wordsWithLocalAudio);
				setTranslations(translations);
				setLastSyncTime(Date.now());

				setSyncing(false);
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : "Unknown error occurred";
				setError(`Sync failed: ${errorMessage}`);
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
			setLanguageLearn,
			setSyncing,
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
							.query(Q.where("word", Q.oneOf(wordIds.map(String))))
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
					transcribtion: w.transcribtion,
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
