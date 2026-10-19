const assert = require("node:assert/strict");
const { test } = require("node:test");
const { create } = require("zustand");
const {
	React,
	act,
	loadSource,
	deferred,
	mount,
	native,
	translation,
	ui,
	Colors,
	logger,
} = require("./helpers.cjs");

function setup({
	chunk = null,
	wordIds,
	read = async () => [],
	hydrated = true,
} = {}) {
	const { useSelectionStore: selection } = loadSource(
		"shared/selection/selectionStore.ts",
	);
	const { useTrainingSelection: training } = loadSource(
		"features/training/model/trainingSelection.ts",
	);
	const { useVocabularyStore: vocabulary } = loadSource(
		"shared/vocabulary/vocabularyStore.ts",
	);
	const session = create(() => ({
		user: { userId: 1, language_learn: "nl", language_speak: "en" },
	}));
	selection.getState().setHasHydrated(hydrated);
	training.getState().setChunkWordIds(chunk);
	const calls = [];
	let value;
	const mocks = {
		"../model/trainingSelection": { useTrainingSelection: training },
		"@/shared/selection/selectionStore": { useSelectionStore: selection },
		"@/shared/vocabulary/vocabularyStore": { useVocabularyStore: vocabulary },
		"@/shared/session/useSession": { useSessionUser: () => session() },
		"expo-router": {
			useLocalSearchParams: () => ({ wordIds }),
			router: { back() {} },
		},
		"react-i18next": translation,
		"react-native": native,
		"@/mob-ui": ui,
		"@/mob-ui/brand/colors": { Colors },
		"@/utils/logger": { logger },
		"@/features/training/services/mixedWordSelection": {
			mixTrainingRepository: {
				getDefaultWordIds: (args) => {
					calls.push({ kind: "default", ...args });
					return read("default", args);
				},
				getDialogueWordIds: (args) => {
					calls.push({ kind: "dialogue", ...args });
					return read("dialogue", args);
				},
			},
		},
		"@/features/training/components/TrainingAppWrapper": {
			TrainingAppWrapper: "Training",
		},
	};
	const { useMixedPreparation } = loadSource(
		"features/training/hooks/useMixedPreparation.ts",
		mocks,
	);
	const { default: Screen } = loadSource(
		"features/training/screens/mix-training.tsx",
		{
			...mocks,
			"../hooks/useMixedPreparation": {
				useMixedPreparation: () => {
					value = useMixedPreparation();
					return value;
				},
			},
		},
	);
	return {
		Screen,
		selection,
		training,
		vocabulary,
		session,
		calls,
		get value() {
			return value;
		},
	};
}

test("an empty first read recovers after sync and then keeps the populated training fixed during background sync", async () => {
	const available = deferred();
	let reads = 0;
	const app = setup({
		read: async () => (++reads === 1 ? [] : available.promise),
	});
	const tree = await mount(app.Screen);
	assert.equal(app.value.ready, true);
	assert.equal(app.value.hasWords, false);
	assert.match(JSON.stringify(tree.toJSON()), /mix_training_no_words/);
	await act(async () => app.vocabulary.getState().setLastSyncTime(1));
	assert.equal(app.value.ready, false);
	await act(async () => available.resolve([11, 12]));
	assert.equal(app.value.hasWords, true);
	assert.equal(tree.root.findAllByType("Training").length, 1);
	const activeIds = app.training.getState().chunkWordIds;
	await act(async () => app.vocabulary.getState().setLastSyncTime(2));
	assert.equal(app.calls.length, 2);
	assert.equal(app.training.getState().chunkWordIds, activeIds);
	assert.equal(app.value.hasWords, true);
	await act(async () => tree.unmount());
});

test("a failed dialogue selection shows retry instead of empty/fallback, and retry can enter training", async () => {
	const recovered = deferred();
	let reads = 0;
	const app = setup({
		wordIds: "7,8",
		read: async () => {
			if (++reads === 1) throw new Error("database unavailable");
			return recovered.promise;
		},
	});
	const tree = await mount(app.Screen);
	assert.equal(app.value.ready, true);
	assert.ok(app.value.error);
	assert.equal(app.training.getState().chunkWordIds, null);
	assert.match(JSON.stringify(tree.toJSON()), /mix_training_error/);
	assert.doesNotMatch(JSON.stringify(tree.toJSON()), /mix_training_no_words/);
	assert.equal(tree.root.findAllByType("Training").length, 0);
	const retry = tree.root
		.findAllByType("Button")
		.find((button) => button.props.mode === "primary");
	await act(async () => retry.props.onPress());
	assert.equal(app.value.ready, false);
	await act(async () => recovered.resolve([7, 8, 9]));
	assert.equal(app.value.error, null);
	assert.equal(app.value.hasWords, true);
	assert.deepEqual(app.training.getState().chunkWordIds, [7, 8, 9]);
	assert.equal(tree.root.findAllByType("Training").length, 1);
	await act(async () => tree.unmount());
});

test("an intro chunk waits for hydration and survives sync, but language and selection changes prepare fresh IDs", async () => {
	const language = deferred(),
		filtered = deferred();
	let reads = 0;
	const app = setup({
		chunk: [4, 5],
		hydrated: false,
		read: async () => (++reads === 1 ? language.promise : filtered.promise),
	});
	const tree = await mount(app.Screen);
	assert.equal(app.value.ready, false);
	assert.equal(app.calls.length, 0);
	await act(async () => app.selection.getState().setHasHydrated(true));
	assert.equal(app.value.hasWords, true);
	assert.deepEqual(app.training.getState().chunkWordIds, [4, 5]);
	const fixed = app.training.getState().chunkWordIds;
	await act(async () => app.vocabulary.getState().setLastSyncTime(1));
	assert.equal(app.calls.length, 0);
	assert.equal(app.training.getState().chunkWordIds, fixed);
	await act(async () =>
		app.session.setState({
			user: { userId: 1, language_learn: "de", language_speak: "en" },
		}),
	);
	assert.equal(app.value.ready, false);
	assert.equal(app.calls[0].learningLanguage, "de");
	await act(async () => app.selection.getState().setCurrentCatalogs([90]));
	assert.deepEqual(app.calls[1].selectedCatalogIds, [90]);
	await act(async () => filtered.resolve([30]));
	await act(async () => language.resolve([20]));
	assert.equal(app.value.hasWords, true);
	assert.deepEqual(app.training.getState().chunkWordIds, [30]);
	await act(async () => tree.unmount());
});

test("a selection from the previous user cannot publish after a newer request resolves", async () => {
	const first = deferred(),
		second = deferred();
	const app = setup({
		read: async (_kind, args) =>
			args.learningLanguage === "nl" ? first.promise : second.promise,
	});
	const tree = await mount(app.Screen);
	await act(async () =>
		app.session.setState({
			user: { userId: 2, language_learn: "fr", language_speak: "ru" },
		}),
	);
	await act(async () => second.resolve([40]));
	await act(async () => first.resolve([10]));
	assert.equal(app.value.error, null);
	assert.deepEqual(app.training.getState().chunkWordIds, [40]);
	assert.equal(app.calls[1].nativeLanguage, "ru");
	await act(async () => tree.unmount());
});

for (const receivesWords of [true, false]) {
	test(`empty preparation stays loading during sync, then ${receivesWords ? "opens training with downloaded words" : "settles empty after failed sync"}`, async () => {
		let downloaded = false;
		const app = setup({ read: async () => (downloaded ? [51, 52] : []) });
		app.vocabulary.getState().setSyncing(true);
		const tree = await mount(app.Screen);
		assert.equal(app.value.ready, false);
		assert.equal(app.value.hasWords, false);
		assert.doesNotMatch(JSON.stringify(tree.toJSON()), /mix_training_no_words/);
		assert.equal(tree.root.findAllByType("ActivityIndicator").length, 1);
		downloaded = receivesWords;
		await act(async () => {
			if (!receivesWords) app.vocabulary.getState().setError("sync failed");
			app.vocabulary.getState().setSyncing(false);
		});
		assert.equal(app.value.ready, true);
		if (receivesWords) {
			assert.equal(tree.root.findAllByType("Training").length, 1);
			assert.deepEqual(app.training.getState().chunkWordIds, [51, 52]);
		} else {
			assert.equal(app.value.hasWords, false);
			assert.match(JSON.stringify(tree.toJSON()), /mix_training_no_words/);
			assert.equal(tree.root.findAllByType("ActivityIndicator").length, 0);
		}
		await act(async () => tree.unmount());
	});
}

test("StrictMode effect replay keeps an intro chunk ready without replacing it during sync", async () => {
	const app = setup({
		chunk: [61, 62],
		read: async () => {
			throw new Error("the fixed chunk must not be reselected");
		},
	});
	const fixed = app.training.getState().chunkWordIds;
	const tree = await mount(() =>
		React.createElement(
			React.StrictMode,
			null,
			React.createElement(app.Screen),
		),
	);
	assert.equal(app.value.ready, true);
	assert.equal(app.value.hasWords, true);
	assert.equal(tree.root.findAllByType("Training").length, 1);
	assert.equal(app.training.getState().chunkWordIds, fixed);
	assert.equal(app.calls.length, 0);
	await act(async () => app.vocabulary.getState().setSyncing(true));
	await act(async () => {
		app.vocabulary.getState().setLastSyncTime(1);
		app.vocabulary.getState().setSyncing(false);
	});
	assert.equal(app.value.ready, true);
	assert.equal(app.training.getState().chunkWordIds, fixed);
	assert.equal(app.calls.length, 0);
	await act(async () => tree.unmount());
});
