import { Q } from "@nozbe/watermelondb";
import * as Sentry from "@sentry/react-native";
import type { Language } from "@vvruspat/words-types";
import * as FileSystem from "expo-file-system/legacy";
import database from "@/db/database";
import Word from "@/db/models/Word";
import type User from "@/db/models/User";
import { isRemoteAudioPath } from "@/utils/audio";
import { logger } from "@/utils/logger";
import { useVocabularyStore } from "@/shared/vocabulary/vocabularyStore";
let activeAudioDownloadId = 0;
export function cancelVocabularyAudio() {
	activeAudioDownloadId++;
}
type FailedAudioDownload = {
	wordId: number;
	audioUrl: string;
};

const sanitizeAudioUrl = (audioUrl: string) => audioUrl.split("?")[0];

const notifyBackgroundAudioDownloadFailure = ({
	error,
	targetLanguage,
	audioCount,
	audioCompleted,
	failures,
}: {
	error?: unknown;
	targetLanguage: Language;
	audioCount: number;
	audioCompleted: number;
	failures?: FailedAudioDownload[];
}) => {
	Sentry.withScope((scope) => {
		scope.setTag("area", "audio");
		scope.setTag("operation", "background_audio_download");
		scope.setContext("audio_download", {
			targetLanguage,
			audioCount,
			audioCompleted,
			failedCount: failures?.length ?? 0,
			failures: failures?.slice(0, 20).map((failure) => ({
				wordId: failure.wordId,
				audioUrl: sanitizeAudioUrl(failure.audioUrl),
			})),
		});

		if (error) {
			Sentry.captureException(error);
			return;
		}

		Sentry.captureMessage("Background audio download left remote audio files", {
			level: "warning",
		});
	});
};

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

export function createAudioDownloader(
	user: Pick<User, "language_learn"> | null,
	isCurrent: () => boolean,
) {
	const setAudioDownloadState: ReturnType<
		typeof useVocabularyStore.getState
	>["setAudioDownloadState"] = (value) => {
		if (isCurrent()) useVocabularyStore.getState().setAudioDownloadState(value);
	};
	return async (languageLearn?: Language) => {
		const targetLanguage = languageLearn ?? (user?.language_learn as Language);

		if (!targetLanguage) {
			return;
		}

		if (useVocabularyStore.getState().isAudioDownloading) {
			return;
		}

		const audioDownloadId = ++activeAudioDownloadId;
		const isActiveDownload = () =>
			activeAudioDownloadId === audioDownloadId && isCurrent();
		let remoteAudioWords: Word[];
		try {
			remoteAudioWords = (
				await database
					.get<Word>("words")
					.query(Q.where("language", targetLanguage))
					.fetch()
			).filter((word) => word.audio && isRemoteAudioPath(word.audio));
		} catch (error) {
			logger.error("Unable to read missing audio", error, "db");
			setAudioDownloadState({
				isAudioDownloading: false,
				audioDownloadError:
					error instanceof Error ? error.message : "Audio database read failed",
			});
			return;
		}
		if (!isActiveDownload()) return;

		const audioCount = remoteAudioWords.length;

		if (audioCount === 0) {
			setAudioDownloadState({
				isAudioDownloading: false,
				audioDownloadProgress: 0,
				audioDownloadCompleted: 0,
				audioDownloadTotal: 0,
				audioDownloadError: null,
			});
			return;
		}

		setAudioDownloadState({
			isAudioDownloading: true,
			audioDownloadProgress: 0.02,
			audioDownloadCompleted: 0,
			audioDownloadTotal: audioCount,
			audioDownloadError: null,
		});

		const AUDIO_CONCURRENCY = 5;
		let audioCompleted = 0;
		let wordIndex = 0;
		const failedDownloads: FailedAudioDownload[] = [];

		const markAudioCompleted = () => {
			audioCompleted += 1;

			if (!isActiveDownload()) {
				return;
			}

			setAudioDownloadState({
				audioDownloadCompleted: audioCompleted,
				audioDownloadProgress: audioCompleted / audioCount,
			});
		};

		async function processNextAudio(): Promise<void> {
			while (wordIndex < remoteAudioWords.length && isActiveDownload()) {
				const word = remoteAudioWords[wordIndex++];
				const localAudioPath = await downloadAudioFile(
					word.audio,
					word.remoteId,
				);

				if (isRemoteAudioPath(localAudioPath)) {
					failedDownloads.push({
						wordId: word.remoteId,
						audioUrl: word.audio,
					});
				} else if (isActiveDownload()) {
					await database.write(async () => {
						if (!isActiveDownload()) return;
						await word.update((w) => {
							w.audio = localAudioPath;
						});
					});
				}

				markAudioCompleted();
			}
		}

		try {
			await Promise.all(
				Array.from(
					{ length: Math.min(AUDIO_CONCURRENCY, audioCount) },
					processNextAudio,
				),
			);

			if (!isActiveDownload()) {
				return;
			}

			if (failedDownloads.length > 0) {
				notifyBackgroundAudioDownloadFailure({
					targetLanguage,
					audioCount,
					audioCompleted,
					failures: failedDownloads,
				});
			}

			setAudioDownloadState({
				isAudioDownloading: false,
				audioDownloadProgress: 1,
				audioDownloadCompleted: audioCount,
				audioDownloadTotal: audioCount,
				audioDownloadError: null,
			});
		} catch (error) {
			if (!isActiveDownload()) {
				return;
			}

			const errorMessage =
				error instanceof Error ? error.message : "Unknown error occurred";

			notifyBackgroundAudioDownloadFailure({
				error,
				targetLanguage,
				audioCount,
				audioCompleted,
				failures: failedDownloads,
			});
			logger.warn("Failed to download audio in background:", error, "audio");
			setAudioDownloadState({
				isAudioDownloading: false,
				audioDownloadError: errorMessage,
			});
		}
	};
}
