const assert = require("node:assert/strict");
const { test } = require("node:test");
const {
	React,
	act,
	loadSource,
	deferred,
	mount,
	native,
	Colors,
	translation,
	ui,
	logger,
} = require("./helpers.cjs");

const { getIncompleteTrainings } = loadSource("utils/mixTrainingProgress.ts");

test("mastery is scoped to each exercise and every word in the current pool", () => {
	const records = [
		{ wordId: 1, training: "choose_translation", score: 0.2 },
		{ wordId: 2, training: "choose_translation", score: 0.2 },
		{ wordId: 1, training: "type_word", score: 1 },
		{ wordId: 2, training: "intro", score: 1 },
		{ wordId: 999, training: "choose_translation", score: 0 },
	];
	assert.deepEqual(
		getIncompleteTrainings(
			[1, 2],
			["choose_translation", "type_word"],
			records,
		),
		["type_word"],
	);
	assert.deepEqual(
		getIncompleteTrainings([1], ["choose_translation", "type_word"], records),
		[],
	);
	assert.deepEqual(getIncompleteTrainings([1, 2], ["true_or_false"], records), [
		"true_or_false",
	]);
});

function setup({
	progress = [],
	wordIds = [1, 2],
	trainings = ["true_or_false", "type_word"],
	save,
	available = true,
	syncing = false,
	mode = "mixed",
} = {}) {
	let context;
	const user = { userId: 1, language_learn: "nl", language_speak: "en" };
	const { useSelectionStore: store } = loadSource(
		"shared/selection/selectionStore.ts",
	);
	const { useTrainingSelection: trainingSelection } = loadSource(
		"features/training/model/trainingSelection.ts",
	);
	const { useVocabularyStore: vocabularyStore } = loadSource(
		"shared/vocabulary/vocabularyStore.ts",
	);
	vocabularyStore.getState().setSyncing(syncing);
	trainingSelection.getState().setChunkWordIds(wordIds);
	const words = wordIds.map((id) => ({ remoteId: id, word: `word ${id}` }));
	const translations = wordIds.map((id) => ({
		remoteId: id,
		word: id,
		translation: `translation ${id}`,
	}));
	const wordsRepository = {
		getByRemoteIds: async () => (available ? words : []),
		findCandidates: async () => (available ? words : []),
	};
	const learningRepository = {
		getByUser: async () => [...progress],
		getByUserAndWordIds: async (_userId, ids) =>
			progress.filter((record) => ids.includes(record.wordId)),
		getByUserAndTraining: async (_userId, id) =>
			progress.filter((record) => record.training === id),
		recordResult: async (params) => {
			if (save) await save(params);
			const previous = progress.find(
				(record) =>
					record.wordId === params.wordId &&
					record.training === params.trainingId,
			);
			const score = params.result === "failure" ? 0 : params.scoreDelta;
			if (previous) previous.score = score;
			else
				progress.push({
					wordId: params.wordId,
					training: params.trainingId,
					score,
				});
		},
	};
	const session = { useSessionUser: () => ({ user }) };
	const storeModule = { useSelectionStore: store };
	const common = {
		"@/features/training/model/trainingSelection": {
			useTrainingSelection: trainingSelection,
		},
		"@/db/repositories/synonymGroups.repository": {
			synonymGroupsRepository: { getSynonymWordIds: async (id) => [id] },
		},
		"react-native": native,
		"react-i18next": translation,
		"@/shared/session/useSession": session,
		"@/shared/selection/selectionStore": storeModule,
		"@/db/repositories/learning.repository": { learningRepository },
		"@/db/repositories/words.repository": { wordsRepository },
		"@/utils/logger": { logger },
		"@/mob-ui": ui,
		"@/mob-ui/brand/colors": { Colors },
	};
	const { ExerciseProvider, ExerciseContext } = loadSource(
		"features/training/components/ExerciseProvider.tsx",
		{
			...common,
			"expo-router": { usePathname: () => "/authorized/learning/mix-training" },
			"@/components/FloatingLike": { FloatingLike: "Like" },
			"@/features/training/components/WordExcerciseResult": {
				WordExcerciseFailureModal: "FailureModal",
				WordExcerciseSuccessModal: "SuccessModal",
			},
			"@/constants/training": { MIX_TRAINING_WORD_LIMIT: 20 },
			"@/db/repositories/translations.repository": {
				translationsRepository: {
					getByWordIds: async () => translations,
					getRandomTranslations: async () => [],
				},
			},
			"@/shared/vocabulary/vocabularyStore": {
				useVocabularyStore: vocabularyStore,
			},
			"@/utils/mixTrainingProgress": { getIncompleteTrainings },
		},
	);
	const exerciseDefinitions = loadSource("shared/training/presentation.ts", {
		"@/mob-ui/brand/colors": { Colors },
	});
	const exercise = (id) =>
		function Exercise() {
			const current = React.useContext(ExerciseContext);
			React.useEffect(() => {
				void current.loadData(id === "match_words" ? 4 : 1, 0, 0);
			}, [current.loadData]);
			return React.createElement("Exercise", { id });
		};
	const { TrainingAppWrapper } = loadSource(
		"features/training/components/TrainingAppWrapper/TrainingAppWrapper.tsx",
		{
			...common,
			"@/context/BackgroundContext": {
				BackgroundContext: React.createContext({
					setColor() {},
					setOpacity() {},
				}),
			},
			"@/features/training/components/ExerciseProvider": { ExerciseContext },
			"@/db/repositories/topics.repository": { topicsRepository: {} },
			"@/general.styles": { styles: { page: {} } },
			"@/shared/audio/useAudioReadiness": {
				useAudioReadiness: () => ({
					isAudioReady: true,
					isAudioReadinessLoading: false,
				}),
			},
			"@/utils/topicProgress": { buildTopicProgressStats() {} },
			"@/utils": { shuffleArray: (items) => [...items] },
			"@expo/vector-icons/AntDesign": "Icon",
			"expo-router": { Link: "Link", router: { back() {} } },
			"react-native-safe-area-context": { SafeAreaView: "SafeAreaView" },
			"@/features/training/components/exercises": {
				CardsExercise: exercise("cards"),
				ChooseTranslationExercise: exercise("choose_translation"),
				ListeningPracticeExercise: exercise("listening_practice"),
				MatchWordsExercise: exercise("match_words"),
				TrueOrFalseExercise: exercise("true_or_false"),
				TypeWordExercise: exercise("type_word"),
			},
			"@/features/training/components/TrainingProgressBar": {
				TrainingProgressBar: "ProgressBar",
			},
			"@/features/training/components/TrainingAppWrapper/TrainingAppWrapper.styles":
				{ trainingAppWrapperStyles: {} },
		},
	);
	const excluded = Object.keys(exerciseDefinitions.EXERCISES_APPS).filter(
		(id) => !trainings.includes(id),
	);
	function Capture() {
		context = React.useContext(ExerciseContext);
		return null;
	}
	function App({ fixedExercise, visible = true }) {
		return React.createElement(
			ExerciseProvider,
			{ mode },
			React.createElement(Capture),
			visible &&
				React.createElement(TrainingAppWrapper, {
					excludedExercises: excluded,
					exercise: fixedExercise,
				}),
		);
	}
	return {
		App,
		store,
		trainingSelection,
		progress,
		vocabularyStore,
		setAvailable(value) {
			available = value;
		},
		get context() {
			return context;
		},
	};
}

const currentExercise = (tree) => tree.root.findByType("Exercise").props.id;

test("reopening a completed standalone training still offers explicit review", async () => {
	const app = setup({
		mode: "single",
		wordIds: [1],
		progress: [{ wordId: 1, training: "cards", score: 0.2 }],
	});
	const tree = await mount(app.App, { fixedExercise: "cards" });
	assert.match(JSON.stringify(tree.toJSON()), /training_mastered_title/);
	await act(async () =>
		tree.update(React.createElement(app.App, { visible: false })),
	);
	await act(async () =>
		tree.update(React.createElement(app.App, { fixedExercise: "cards" })),
	);
	assert.match(JSON.stringify(tree.toJSON()), /training_mastered_title/);
	await act(async () => tree.unmount());
});

test("review preserves a matching round's pair count", async () => {
	const app = setup({
		mode: "single",
		wordIds: [1, 2, 3, 4],
		progress: [1, 2, 3, 4].map((wordId) => ({
			wordId,
			training: "match_words",
			score: 0.1,
		})),
	});
	const tree = await mount(app.App, { fixedExercise: "match_words" });
	await act(async () => app.context.startReview());
	assert.equal(app.context.wordsPool.currentPairs.length, 4);
	await act(async () => tree.unmount());
});

test("first sync replaces an empty training snapshot without restarting a populated session", async () => {
	const app = setup({ mode: "single", available: false, syncing: true });
	const tree = await mount(app.App, { fixedExercise: "cards" });
	assert.equal(app.context.queueReady, false);
	assert.doesNotMatch(JSON.stringify(tree.toJSON()), /mix_training_no_words/);
	await act(async () => {
		app.setAvailable(true);
		app.vocabularyStore.getState().setLastSyncTime(1);
		app.vocabularyStore.getState().setSyncing(false);
	});
	assert.equal(currentExercise(tree), "cards");
	assert.equal(app.context.sessionStats.totalCount, 2);
	const displayed = app.context.wordsPool.currentPairs[0];
	await act(async () =>
		app.context.onSuccess(displayed.word.remoteId, 0.2, false),
	);
	await act(async () => {
		app.vocabularyStore.getState().setSyncing(true);
		app.vocabularyStore.getState().setLastSyncTime(2);
		app.vocabularyStore.getState().setSyncing(false);
	});
	assert.equal(app.context.sessionStats.successCount, 1);
	assert.equal(app.context.wordsPool.currentPairs[0], displayed);
	await act(async () => tree.unmount());
});

test("mix skips mastered exercises at startup and after a quick answer, then completes", async () => {
	const pending = deferred();
	const app = setup({
		wordIds: [1],
		progress: [{ wordId: 1, training: "choose_translation", score: 0.2 }],
		trainings: ["choose_translation", "true_or_false", "type_word"],
		save: () => pending.promise,
	});
	const tree = await mount(app.App);
	assert.equal(currentExercise(tree), "true_or_false");
	await act(async () => {
		app.context.onSuccess(1, 0.2, false);
		app.context.complete();
	});
	assert.equal(
		tree.root.findAllByType("Exercise").length,
		0,
		"wait for the pending DB result",
	);
	await act(async () => pending.resolve());
	assert.equal(
		currentExercise(tree),
		"type_word",
		"100% exercises must not be selected again",
	);
	await act(async () => {
		app.context.onSuccess(1, 0.2, false);
		app.context.complete();
	});
	assert.match(JSON.stringify(tree.toJSON()), /mix_training_completed/);
	assert.equal(tree.root.findAllByType("Exercise").length, 0);
	await act(async () => tree.unmount());
});

test("an unfinished exercise keeps serving its unmastered words", async () => {
	const app = setup({ trainings: ["true_or_false"] });
	const tree = await mount(app.App);
	const first = app.context.wordsPool.currentPairs[0].word.remoteId;
	await act(async () => {
		app.context.onSuccess(first, 0.2, false);
		app.context.complete();
	});
	assert.equal(currentExercise(tree), "true_or_false");
	assert.notEqual(app.context.wordsPool.currentPairs[0].word.remoteId, first);
	assert.equal(app.context.sessionStats.successCount, 1);
	await act(async () => tree.unmount());
});

test("a failed review removes mastery from the bar and next-exercise selection", async () => {
	const pending = deferred();
	const app = setup({
		wordIds: [1],
		progress: [{ wordId: 1, training: "true_or_false", score: 0.2 }],
		save: () => pending.promise,
	});
	const tree = await mount(app.App, { fixedExercise: "true_or_false" });
	assert.equal(app.context.sessionStats.successCount, 1);
	await act(async () => app.context.onFailure(1, 0.2, false));
	assert.equal(app.context.sessionStats.successCount, 0);
	assert.equal(app.context.sessionStats.failureCount, 1);
	const available = app.context.getIncompleteTrainingIds(["true_or_false"]);
	await act(async () => pending.resolve());
	assert.deepEqual(await available, ["true_or_false"]);
	await act(async () => tree.unmount());
});

test("a completed pool stays complete when reopening, ignoring words outside the pool", async () => {
	const app = setup({
		wordIds: [1],
		progress: [
			{ wordId: 1, training: "true_or_false", score: 0.2 },
			{ wordId: 1, training: "type_word", score: 0.1 },
			{ wordId: 999, training: "type_word", score: 0 },
		],
	});
	for (let visit = 0; visit < 2; visit++) {
		const tree = await mount(app.App);
		assert.match(JSON.stringify(tree.toJSON()), /mix_training_completed/);
		assert.equal(tree.root.findAllByType("Exercise").length, 0);
		await act(async () => tree.unmount());
	}
});

test("matching skips its mastered pool and never pulls new words into a fixed mix", async () => {
	const app = setup({
		trainings: ["match_words", "type_word"],
		progress: [
			{ wordId: 1, training: "match_words", score: 0.1 },
			{ wordId: 2, training: "match_words", score: 0.1 },
		],
	});
	const tree = await mount(app.App);
	assert.equal(currentExercise(tree), "type_word");
	assert.ok(
		[1, 2].includes(app.context.wordsPool.currentPairs[0].word.remoteId),
	);
	assert.deepEqual(app.trainingSelection.getState().chunkWordIds, [1, 2]);
	await act(async () => tree.unmount());
});

test("StrictMode hydration survives effect replay and duplicate answers persist once", async () => {
	let writes = 0;
	const app = setup({
		wordIds: [1],
		trainings: ["true_or_false"],
		save: async () => {
			writes++;
		},
	});
	const tree = await mount(() =>
		React.createElement(React.StrictMode, null, React.createElement(app.App)),
	);
	const answered = app.context;
	await act(async () => {
		answered.onSuccess(1, 0.2, false);
		answered.onSuccess(1, 0.2, false);
		answered.complete();
		answered.complete();
	});
	assert.equal(writes, 1);
	assert.match(JSON.stringify(tree.toJSON()), /mix_training_completed/);
	await act(async () => tree.unmount());
});
test("an event retained by an old displayed step cannot score a new exercise", async () => {
	const app = setup({ wordIds: [1] });
	const tree = await mount(app.App, { fixedExercise: "true_or_false" });
	const old = app.context.onSuccess;
	await act(async () => app.context.setCurrentTrainingId("type_word"));
	await act(async () => old(1, 0.2, false));
	assert.equal(
		app.progress.length,
		0,
		"switch invalidates displayed handlers before next load",
	);
	await act(async () => app.context.loadData(1, 0, 0));
	await act(async () => old(1, 0.2, false));
	assert.equal(app.progress.length, 0);
	await act(async () => tree.unmount());
});
test("a failed persistence blocks completion and a deliberate retry reloads durable progress", async () => {
	let fail = true;
	const app = setup({
		wordIds: [1],
		trainings: ["true_or_false"],
		save: async () => {
			if (fail) throw new Error("disk unavailable");
		},
	});
	const tree = await mount(app.App);
	await act(async () => app.context.onSuccess(1, 0.2, false));
	await assert.rejects(
		app.context.getIncompleteTrainingIds(["true_or_false"]),
		/disk unavailable/,
	);
	assert.equal(app.context.status, "error");
	assert.equal(app.progress.length, 0);
	fail = false;
	await act(async () => app.context.retry());
	await act(async () => app.context.loadData(1, 0, 0));
	await act(async () => app.context.onSuccess(1, 0.2, false));
	await act(async () =>
		assert.deepEqual(
			await app.context.getIncompleteTrainingIds(["true_or_false"]),
			[],
		),
	);
	await act(async () => tree.unmount());
});
