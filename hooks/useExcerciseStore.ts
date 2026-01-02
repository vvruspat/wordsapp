import Word from "@/db/models/Word";
import WordTranslation from "@/db/models/WordTranslation";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

type ExcerciseState = {
	currentPairs: {
		word: Word;
		translation?: WordTranslation;
	}[];
	currentCatalog: number | null;
	currentTopic: number | null;
	currentRandomWords: Word[];
	currentRandomTranslations: WordTranslation[];
};

type ExcerciseActions = {
	setCurrentPairs: (
		pairs: { word: Word; translation?: WordTranslation }[],
	) => void;
	setCurrentCatalog: (catalog: number | null) => void;
	setCurrentTopic: (topic: number | null) => void;
	setCurrentRandomWords: (words: Word[]) => void;
	setCurrentRandomTranslations: (translations: WordTranslation[]) => void;
};

export const useExcerciseStore = create<ExcerciseState & ExcerciseActions>()(
	immer((set) => ({
		currentPairs: [],
		currentCatalog: null,
		currentTopic: null,
		currentRandomWords: [],
		currentRandomTranslations: [],

		setCurrentCatalog: (catalog: number | null) =>
			set((state) => {
				state.currentCatalog = catalog;
			}),
		setCurrentTopic: (topic: number | null) =>
			set((state) => {
				state.currentTopic = topic;
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
	})),
);
