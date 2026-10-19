import { create } from "zustand";
type SelectionState = {
	currentCatalogs: number[];
	currentTopics: number[];
	_hasHydrated: boolean;
	topicsInitialized: boolean;
	setCurrentCatalogs: (ids: number[]) => void;
	setCurrentTopics: (ids: number[]) => void;
	setHasHydrated: (value: boolean) => void;
	setTopicsInitialized: (value: boolean) => void;
	reset: () => void;
};
const initial = {
	currentCatalogs: [] as number[],
	currentTopics: [] as number[],
	_hasHydrated: false,
	topicsInitialized: false,
};
export const useSelectionStore = create<SelectionState>((set) => ({
	...initial,
	setCurrentCatalogs: (currentCatalogs) => set({ currentCatalogs }),
	setCurrentTopics: (currentTopics) => set({ currentTopics }),
	setHasHydrated: (_hasHydrated) => set({ _hasHydrated }),
	setTopicsInitialized: (topicsInitialized) => set({ topicsInitialized }),
	reset: () => set(initial),
}));
