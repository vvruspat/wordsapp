import { components } from "@vvruspat/words-types";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

type WordDto = components["schemas"]["WordDto"];
type WordTranslationDto = components["schemas"]["WordTranslationDto"];
type VocabCatalogDto = components["schemas"]["VocabCatalogDto"];
type TopicDto = components["schemas"]["TopicDto"];
type TopicTranslationDto = components["schemas"]["TopicTranslationDto"];

type AudioDownloadState = {
	isAudioDownloading: boolean;
	audioDownloadProgress: number;
	audioDownloadCompleted: number;
	audioDownloadTotal: number;
	audioDownloadError: string | null;
};

type VocabularyState = {
	words: WordDto[];
	translations: WordTranslationDto[];
	catalogs: VocabCatalogDto[];
	topics: TopicDto[];
	topicTranslations: TopicTranslationDto[];
	languageLearn: string | null;
	isLoading: boolean;
	isSyncing: boolean;
	syncProgress: number;
	syncStatus: string | null;
	lastSyncTime: number | null;
	error: string | null;
} & AudioDownloadState;

type VocabularyActions = {
	setWords: (words: WordDto[]) => void;
	setWordAudio: (wordId: number, audio: string) => void;
	setTranslations: (translations: WordTranslationDto[]) => void;
	setCatalogs: (catalogs: VocabCatalogDto[]) => void;
	setTopics: (topics: TopicDto[]) => void;
	setTopicTranslations: (topicTranslations: TopicTranslationDto[]) => void;
	setLanguageLearn: (language: string) => void;
	setLoading: (loading: boolean) => void;
	setSyncing: (syncing: boolean) => void;
	setSyncProgress: (progress: number) => void;
	setSyncStatus: (status: string | null) => void;
	setLastSyncTime: (time: number) => void;
	setError: (error: string | null) => void;
	clearError: () => void;
	setAudioDownloadState: (state: Partial<AudioDownloadState>) => void;
	reset: () => void;
};

const initialState: VocabularyState = {
	words: [],
	translations: [],
	catalogs: [],
	topics: [],
	topicTranslations: [],
	languageLearn: null,
	isLoading: false,
	isSyncing: false,
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
		setWords: (words) =>
			set((state) => {
				state.words = words;
			}),
		setWordAudio: (wordId, audio) =>
			set((state) => {
				const word = state.words.find((item) => item.id === wordId);
				if (word) {
					word.audio = audio;
				}
			}),
		setTranslations: (translations) =>
			set((state) => {
				state.translations = translations;
			}),
		setCatalogs: (catalogs) =>
			set((state) => {
				state.catalogs = catalogs;
			}),
		setTopics: (topics) =>
			set((state) => {
				state.topics = topics;
			}),
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
