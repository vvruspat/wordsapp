import { components } from "@vvruspat/words-types";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

type TopicTranslationDto = components["schemas"]["TopicTranslationDto"];

type AudioDownloadState = {
	isAudioDownloading: boolean;
	audioDownloadProgress: number;
	audioDownloadCompleted: number;
	audioDownloadTotal: number;
	audioDownloadError: string | null;
};

type VocabularyState = {
	topicTranslations: TopicTranslationDto[];
	languageLearn: string | null;
	isLoading: boolean;
	isSyncing: boolean;
	isBackgroundSync: boolean;
	syncProgress: number;
	syncStatus: string | null;
	lastSyncTime: number | null;
	error: string | null;
} & AudioDownloadState;

type VocabularyActions = {
	setTopicTranslations: (topicTranslations: TopicTranslationDto[]) => void;
	setLanguageLearn: (language: string) => void;
	setLoading: (loading: boolean) => void;
	setSyncing: (syncing: boolean) => void;
	setBackgroundSync: (background: boolean) => void;
	setSyncProgress: (progress: number) => void;
	setSyncStatus: (status: string | null) => void;
	setLastSyncTime: (time: number) => void;
	setError: (error: string | null) => void;
	clearError: () => void;
	setAudioDownloadState: (state: Partial<AudioDownloadState>) => void;
	reset: () => void;
};

const initialState: VocabularyState = {
	topicTranslations: [],
	languageLearn: null,
	isLoading: false,
	isSyncing: false,
	isBackgroundSync: false,
	syncProgress: 0,
	syncStatus: null,
	lastSyncTime: null,
	error: null,
	isAudioDownloading: false,
	audioDownloadProgress: 0,
	audioDownloadCompleted: 0,
	audioDownloadTotal: 0,
	audioDownloadError: null,
};

export const useVocabularyStore = create<VocabularyState & VocabularyActions>()(
	immer((set) => ({
		...initialState,
		setTopicTranslations: (topicTranslations) =>
			set((state) => {
				state.topicTranslations = topicTranslations;
			}),
		setLanguageLearn: (language) =>
			set((state) => {
				state.languageLearn = language;
			}),
		setLoading: (loading) =>
			set((state) => {
				state.isLoading = loading;
			}),
		setSyncing: (syncing) =>
			set((state) => {
				state.isSyncing = syncing;
			}),
		setBackgroundSync: (background) =>
			set((state) => {
				state.isBackgroundSync = background;
			}),
		setSyncProgress: (progress) =>
			set((state) => {
				state.syncProgress = progress;
			}),
		setSyncStatus: (status) =>
			set((state) => {
				state.syncStatus = status;
			}),
		setLastSyncTime: (time) =>
			set((state) => {
				state.lastSyncTime = time;
			}),
		setError: (error) =>
			set((state) => {
				state.error = error;
			}),
		clearError: () =>
			set((state) => {
				state.error = null;
			}),
		setAudioDownloadState: (audioState) =>
			set((state) => {
				Object.assign(state, audioState);
			}),
		reset: () =>
			set((state) => {
				Object.assign(state, initialState);
			}),
	})),
);
