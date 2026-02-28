import * as Sentry from "@sentry/react-native";
import type { LogCategory, LogEntry, LogLevel } from "@/hooks/useLogStore";
import { useLogStore } from "@/hooks/useLogStore";

export type { LogLevel, LogCategory, LogEntry };

const LEVEL_EMOJIS: Record<LogLevel, string> = {
	debug: "🔵",
	info: "🟢",
	warn: "🟡",
	error: "🔴",
};

let _id = 0;

function log(
	level: LogLevel,
	category: LogCategory,
	message: string,
	data?: unknown,
): void {
	const entry: LogEntry = {
		id: `${Date.now()}-${++_id}`,
		timestamp: new Date(),
		level,
		category,
		message,
		data,
	};

	useLogStore.getState().addLog(entry);

	if (__DEV__) {
		const prefix = `${LEVEL_EMOJIS[level]} [${category}]`;
		const method = level === "debug" ? "log" : level;
		data !== undefined
			? console[method](prefix, message, data)
			: console[method](prefix, message);
	}

	Sentry.addBreadcrumb({
		category,
		message,
		level: level as Sentry.SeverityLevel,
		data: data as Record<string, unknown> | undefined,
	});

	if (level === "error") {
		const err = data instanceof Error ? data : new Error(message);
		Sentry.captureException(
			err,
			data !== undefined && !(data instanceof Error)
				? { extra: { data } }
				: undefined,
		);
	}
}

export const logger = {
	debug: (
		message: string,
		data?: unknown,
		category: LogCategory = "general",
	) => log("debug", category, message, data),

	info: (
		message: string,
		data?: unknown,
		category: LogCategory = "general",
	) => log("info", category, message, data),

	warn: (
		message: string,
		data?: unknown,
		category: LogCategory = "general",
	) => log("warn", category, message, data),

	error: (
		message: string,
		data?: unknown,
		category: LogCategory = "general",
	) => log("error", category, message, data),
};
