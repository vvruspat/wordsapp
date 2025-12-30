import { components } from "@repo/types";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

type WordDto = components["schemas"]["WordDto"];
type WordTranslationDto = components["schemas"]["WordTranslationDto"];
type VocabCatalogDto = components["schemas"]["VocabCatalogDto"];
type TopicDto = components["schemas"]["TopicDto"];

type VocabularyState = {
	words: WordDto[];
	translations: WordTranslationDto[];
	catalogs: VocabCatalogDto[];
	topics: TopicDto[];
	languageLearn: string | null;
	isLoading: boolean;
	isSyncing: boolean;
	lastSyncTime: number | null;
	error: string | null;
};

type VocabularyActions = {
	setWords: (words: WordDto[]) => void;
	setTranslations: (translations: WordTranslationDto[]) => void;
	setCatalogs: (catalogs: VocabCatalogDto[]) => void;
	setTopics: (topics: TopicDto[]) => void;
	setLanguageLearn: (language: string) => void;
	setLoading: (loading: boolean) => void;
	setSyncing: (syncing: boolean) => void;
	setLastSyncTime: (time: number) => void;
	setError: (error: string | null) => void;
	clearError: () => void;
	reset: () => void;
};

const initialState: VocabularyState = {
	words: [],
	translations: [],
	catalogs: [],
	topics: [],
	languageLearn: null,
	isLoading: false,
	isSyncing: false,
	lastSyncTime: null,
	error: null,
};

export const useVocabularyStore = create<VocabularyState & VocabularyActions>()(
	immer((set) => ({
		...initialState,
		setWords: (words) =>
			set((state) => {
				state.words = words;
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
		reset: () =>
			set((state) => {
				Object.assign(state, initialState);
			}),
	})),
);
