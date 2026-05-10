import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import Word from "@/db/models/Word";
import WordTranslation from "@/db/models/WordTranslation";

type ExcerciseState = {
	currentPairs: {
		word: Word;
		translation?: WordTranslation;
	}[];
	currentCatalogs: number[];
	currentTopics: number[];
	currentRandomWords: Word[];
	currentRandomTranslations: WordTranslation[];
	_hasHydrated: boolean;
	topicsInitialized: boolean;
	chunkWordIds: number[] | null;
};

type ExcerciseActions = {
	setCurrentPairs: (
		pairs: { word: Word; translation?: WordTranslation }[],
	) => void;
	setCurrentCatalogs: (catalogs: number[]) => void;
	setCurrentTopics: (topics: number[]) => void;
	setCurrentRandomWords: (words: Word[]) => void;
	setCurrentRandomTranslations: (translations: WordTranslation[]) => void;
	setHasHydrated: (value: boolean) => void;
	setTopicsInitialized: (value: boolean) => void;
	setChunkWordIds: (ids: number[] | null) => void;
	reset: () => void;
};

const initialState: ExcerciseState = {
	currentPairs: [],
	currentCatalogs: [],
	currentTopics: [],
	currentRandomWords: [],
	currentRandomTranslations: [],
	_hasHydrated: false,
	topicsInitialized: false,
	chunkWordIds: null,
};

export const useExcerciseStore = create<ExcerciseState & ExcerciseActions>()(
	immer((set) => ({
		...initialState,

		setCurrentCatalogs: (catalogs: number[]) =>
			set((state) => {
				state.currentCatalogs = catalogs;
			}),
		setCurrentTopics: (topics: number[]) =>
			set((state) => {
				state.currentTopics = topics;
			}),
		setCurrentPairs: (pairs: { word: Word; translation?: WordTranslation }[]) =>
			set((state) => {
				state.currentPairs = pairs;
			}),
		setCurrentRandomWords: (words: Word[]) =>
			set((state) => {
				state.currentRandomWords = words;
			}),
		setCurrentRandomTranslations: (translations: WordTranslation[]) =>
			set((state) => {
				state.currentRandomTranslations = translations;
			}),
		setHasHydrated: (value: boolean) =>
			set((state) => {
				state._hasHydrated = value;
			}),
		setTopicsInitialized: (value: boolean) =>
			set((state) => {
				state.topicsInitialized = value;
			}),
		setChunkWordIds: (ids) =>
			set((state) => {
				state.chunkWordIds = ids;
			}),
		reset: () =>
			set((state) => {
				Object.assign(state, initialState);
			}),
	})),
);
