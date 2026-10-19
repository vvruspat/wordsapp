const assert = require("node:assert/strict");
const { test } = require("node:test");
const { loadSource, deferred, logger } = require("./helpers.cjs");
function setup({ queue, readError = false, downloadStatus = 200 } = {}) {
	const { useVocabularyStore: store } = loadSource(
		"shared/vocabulary/vocabularyStore.ts",
	);
	let updates = 0,
		reports = 0;
	const word = {
		remoteId: 1,
		audio: "https://example.com/audio.mp3",
		update: async (fn) => {
			updates++;
			fn(word);
		},
	};
	const db = {
		get: () => ({
			query: () => ({
				fetch: async () => {
					if (readError) throw new Error("database unavailable");
					return [word];
				},
			}),
		}),
		write: async (fn) => {
			if (queue) await queue.promise;
			await fn();
		},
	};
	const module = loadSource("shared/audio/vocabularyAudio.ts", {
		"@/db/database": { __esModule: true, default: db },
		"@/shared/vocabulary/vocabularyStore": { useVocabularyStore: store },
		"@/utils/logger": { logger: { ...logger, warn() {} } },
		"expo-file-system/legacy": {
			documentDirectory: "/local/",
			getInfoAsync: async (path) => ({ exists: path.endsWith("audio/") }),
			makeDirectoryAsync: async () => {},
			downloadAsync: async () => ({ status: downloadStatus }),
		},
		"@sentry/react-native": {
			withScope: (fn) => fn({ setTag() {}, setContext() {} }),
			captureMessage() {
				reports++;
			},
			captureException() {
				reports++;
			},
		},
	});
	return {
		store,
		word,
		module,
		download: module.createAudioDownloader(
			{ language_learn: "nl" },
			() => true,
		),
		get updates() {
			return updates;
		},
		get reports() {
			return reports;
		},
	};
}
test("cancelled audio queued behind a writer cannot mutate the word", async () => {
	const queue = deferred(),
		app = setup({ queue });
	const request = app.download("nl");
	await new Promise((resolve) => setImmediate(resolve));
	app.module.cancelVocabularyAudio();
	queue.resolve();
	await request;
	assert.equal(app.updates, 0);
	assert.equal(app.word.audio, "https://example.com/audio.mp3");
});
test("audio read failures are handled, and partial downloads retain remote fallback", async () => {
	const failed = setup({ readError: true });
	await failed.download("nl");
	assert.match(
		failed.store.getState().audioDownloadError,
		/database unavailable/,
	);
	const partial = setup({ downloadStatus: 500 });
	await partial.download("nl");
	assert.equal(partial.updates, 0);
	assert.equal(partial.reports, 1);
	assert.equal(partial.word.audio, "https://example.com/audio.mp3");
});
