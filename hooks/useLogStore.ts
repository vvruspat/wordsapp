import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

export type LogLevel = "debug" | "info" | "warn" | "error";
export type LogCategory =
	| "network"
	| "db"
	| "auth"
	| "audio"
	| "sync"
	| "ui"
	| "general";

export interface LogEntry {
	id: string;
	timestamp: Date;
	level: LogLevel;
	category: LogCategory;
	message: string;
	data?: unknown;
}

interface LogStore {
	logs: LogEntry[];
	filterLevel: LogLevel | "all";
	filterCategory: LogCategory | "all";
	search: string;
	isVisible: boolean;
	addLog: (entry: LogEntry) => void;
	setFilterLevel: (level: LogLevel | "all") => void;
	setFilterCategory: (category: LogCategory | "all") => void;
	setSearch: (search: string) => void;
	toggleVisible: () => void;
	clearLogs: () => void;
}

const MAX_LOGS = 500;

export const useLogStore = create<LogStore>()(
	immer((set) => ({
		logs: [],
		filterLevel: "all",
		filterCategory: "all",
		search: "",
		isVisible: false,
		addLog: (entry) =>
			set((state) => {
				state.logs.unshift(entry);
				if (state.logs.length > MAX_LOGS) {
					state.logs.splice(MAX_LOGS);
				}
			}),
		setFilterLevel: (level) =>
			set((state) => {
				state.filterLevel = level;
			}),
		setFilterCategory: (category) =>
			set((state) => {
				state.filterCategory = category;
			}),
		setSearch: (search) =>
			set((state) => {
				state.search = search;
			}),
		toggleVisible: () =>
			set((state) => {
				state.isVisible = !state.isVisible;
			}),
		clearLogs: () =>
			set((state) => {
				state.logs = [];
			}),
	})),
);
