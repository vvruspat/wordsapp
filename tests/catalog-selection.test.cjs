const assert = require("node:assert/strict");
const { test } = require("node:test");
const { act, loadSource, mount, logger } = require("./helpers.cjs");
test("A1/A2 and My Words defaults preserve a manual deselection on future emissions", async () => {
	const { useSelectionStore: store } = loadSource(
		"shared/selection/selectionStore.ts",
	);
	store.getState().setHasHydrated(true);
	let emit;
	const { useDefaultCatalogSelection } = loadSource(
		"shared/selection/useDefaultCatalogSelection.ts",
		{
			"@/shared/selection/selectionStore": { useSelectionStore: store },
			"@/utils/logger": { logger },
			"@/db/repositories/userSettings.repository": {
				userSettingsRepository: { get: async () => null, set: async () => {} },
			},
			"@/db/repositories/vocabcatalog.repository": {
				vocabcatalogRepository: {
					observeByLanguage: () => ({
						subscribe: (callback) => {
							emit = callback;
							return { unsubscribe() {} };
						},
					}),
				},
			},
		},
	);
	function Probe() {
		useDefaultCatalogSelection(1, "nl");
		return null;
	}
	const tree = await mount(Probe);
	const rows = [
		{ remoteId: 1, title: "A1", owner: 0 },
		{ remoteId: 2, title: "A2", owner: 0 },
		{ remoteId: 3, title: "My Words", owner: 1 },
	];
	await act(async () => emit(rows));
	assert.deepEqual(store.getState().currentCatalogs, [1, 2, 3]);
	await act(async () => store.getState().setCurrentCatalogs([1, 2]));
	await act(async () => emit(rows));
	assert.deepEqual(store.getState().currentCatalogs, [1, 2]);
	await act(async () => tree.unmount());
});

test("late catalog rows from a previous language cannot replace the current catalog", async () => {
	const { React, deferred, translation } = require("./helpers.cjs");
	const gate = deferred();
	const { useSelectionStore: store } = loadSource(
		"shared/selection/selectionStore.ts",
	);
	let value;
	const user = { userId: 1, language_learn: "nl", language_speak: "en" };
	const { useCatalog } = loadSource("features/catalog/hooks/useCatalog.ts", {
		"@/shared/session/useSession": { useSessionUser: () => ({ user }) },
		"@/shared/selection/selectionStore": { useSelectionStore: store },
		"@/shared/vocabulary/vocabularyStore": {
			useVocabularyStore: Object.assign(
				() => ({ topicTranslations: [], lastSyncTime: null }),
				{ getState: () => ({ lastSyncTime: null }) },
			),
		},
		"expo-router": {
			useFocusEffect: (callback) => React.useEffect(callback, [callback]),
		},
		"react-i18next": translation,
		"@/utils/logger": { logger },
		"@/db/repositories/words.repository": {
			wordsRepository: { getTopicsByCatalogs: async () => new Set() },
		},
		"@/db/repositories/learning.repository": { learningRepository: {} },
		"@/db/repositories/userSettings.repository": {
			userSettingsRepository: { set: async () => {} },
		},
		"@/db/repositories/topics.repository": {
			topicsRepository: { getByLanguage: async () => [] },
		},
		"@/db/repositories/vocabcatalog.repository": {
			vocabcatalogRepository: {
				getByLanguage: async (language) =>
					language === "nl" ? gate.promise : [{ title: "New", remoteId: 2 }],
			},
		},
	});
	function Probe() {
		value = useCatalog();
		return null;
	}
	const tree = await mount(Probe);
	user.language_learn = "de";
	await act(async () => tree.update(React.createElement(Probe)));
	assert.equal(value.catalogs[0].remoteId, 2);
	await act(async () => gate.resolve([{ title: "Old", remoteId: 1 }]));
	assert.equal(value.catalogs[0].remoteId, 2);
	await act(async () => tree.unmount());
});
