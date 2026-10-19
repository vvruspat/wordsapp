const assert = require("node:assert/strict");
const { test } = require("node:test");
const { loadSource, deferred, logger } = require("./helpers.cjs");
function setup({ cached = false, online = true, gate } = {}) {
	const { useVocabularyStore: store } = loadSource(
		"hooks/useVocabularyStore.ts",
	);
	let fetches = 0,
		writes = 0;
	const database = {
		get: () => ({
			query: () => ({
				fetchCount: async () => (cached ? 1 : 0),
				fetch: async () => [],
			}),
		}),
		write: async (fn) => {
			writes++;
			await fn();
		},
	};
	const success = async () => ({ status: "success", data: { items: [] } });
	const api = {
		getCatalogs: async () => {
			fetches++;
			if (gate) await gate.promise;
			return { status: "success", data: { items: [] } };
		},
		getTopics: success,
		getWords: success,
		getWordTranslations: success,
		getTopicTranslations: success,
		getSynonymGroups: success,
	};
	const module = loadSource("shared/vocabulary/vocabularyCoordinator.ts", {
		"@/db/database": { default: database, __esModule: true },
		"@/hooks/useVocabularyStore": { useVocabularyStore: store },
		"@/api/vocabulary": api,
		"@/utils/logger": { logger },
		"@react-native-community/netinfo": {
			fetch: async () => ({ isConnected: online }),
		},
		"expo-file-system/legacy": {},
		"@sentry/react-native": {},
	});
	const operations = module.createVocabularyOperations({
		userId: 1,
		language_learn: "nl",
		language_speak: "en",
	});
	return {
		operations,
		store,
		module,
		get fetches() {
			return fetches;
		},
		get writes() {
			return writes;
		},
	};
}
test("vocabulary coordinator shares in-flight sync and preserves cached/background semantics", async () => {
	const gate = deferred();
	const app = setup({ cached: true, gate });
	const first = app.operations.syncVocabulary("nl"),
		second = app.operations.syncVocabulary("nl");
	assert.equal(first, second);
	await new Promise((resolve) => setImmediate(resolve));
	assert.equal(app.fetches, 1);
	assert.equal(app.store.getState().isBackgroundSync, true);
	gate.resolve();
	await first;
	assert.equal(app.store.getState().isSyncing, false);
	assert.equal(app.writes, 1);
});
test("offline sync retains cache and cancelled old operations cannot publish or start persistence", async () => {
	const offline = setup({ online: false });
	await offline.operations.syncVocabulary("nl");
	assert.equal(offline.fetches, 0);
	assert.equal(offline.writes, 0);
	const gate = deferred();
	const app = setup({ gate });
	const pending = app.operations.syncVocabulary("nl");
	await new Promise((resolve) => setImmediate(resolve));
	app.module.invalidateVocabularyOperations();
	app.store.getState().reset();
	gate.resolve();
	await pending;
	assert.equal(app.writes, 0);
	assert.equal(app.store.getState().lastSyncTime, null);
	assert.equal(app.store.getState().words.length, 0);
});
