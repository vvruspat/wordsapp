import { Word, WordTranslation } from "@repo/types";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

type ExcerciseState = {
	currentWord: Word | null;
	currentTranslation: WordTranslation | null;
	currentCatalog: number | null;
	currentTopic: number | null;
};

type ExcerciseActions = {
	setCurrentWord: (word: Word | null) => void;
	setCurrentTranslation: (translation: WordTranslation | null) => void;
	setCurrentCatalog: (catalog: number | null) => void;
	setCurrentTopic: (topic: number | null) => void;
};

export const useExcerciseStore = create<ExcerciseState & ExcerciseActions>()(
	immer((set) => ({
		currentWord: null,
		currentTranslation: null,
		currentCatalog: null,
		currentTopic: null,
		setCurrentWord: (word: Word | null) =>
			set((state) => {
				state.currentWord = word;
			}),
		setCurrentTranslation: (translation: WordTranslation | null) =>
			set((state) => {
				state.currentTranslation = translation;
			}),
		setCurrentCatalog: (catalog: number | null) =>
			set((state) => {
				state.currentCatalog = catalog;
			}),
		setCurrentTopic: (topic: number | null) =>
			set((state) => {
				state.currentTopic = topic;
			}),
	})),
);
