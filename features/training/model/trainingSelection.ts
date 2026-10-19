import { create } from "zustand";
// IDs intentionally supplied by intro or dialogue route. The running controller
// snapshots this input; only it owns the active word/exercise queues.
export const useTrainingSelection = create<{
	chunkWordIds: number[] | null;
	setChunkWordIds: (ids: number[] | null) => void;
	reset: () => void;
}>((set) => ({
	chunkWordIds: null,
	setChunkWordIds: (ids) => set({ chunkWordIds: ids }),
	reset: () => set({ chunkWordIds: null }),
}));
