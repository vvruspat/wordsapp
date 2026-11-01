const assert = require("node:assert/strict");
const { test } = require("node:test");
const {
	React,
	act,
	loadSource,
	deferred,
	mount,
	native,
	ui,
	translation,
} = require("./helpers.cjs");

function setup(words = ["gezin"]) {
	const jobs = [];
	class Value {
		constructor(value) {
			this.value = value;
		}
		setValue(value) {
			this.value = value;
		}
	}
	const animation = (finish = () => {}) => {
		let stopped = false;
		return {
			finish,
			start(callback) {
				jobs.push(() => {
					if (!stopped) {
						finish();
						callback?.({ finished: true });
					}
				});
			},
			stop() {
				stopped = true;
			},
		};
	};
	const group = (items) =>
		animation(() => {
			for (const item of items) item.finish();
		});
	const Animated = {
		Value,
		View: "AnimatedView",
		timing: (value, { toValue }) => animation(() => value.setValue(toValue)),
		parallel: group,
		sequence: group,
		stagger: (_delay, items) => group(items),
		delay: () => animation(),
	};
	const listeners = new Set();
	const pairs = words.map((word, index) => ({
		word: { remoteId: index + 1, word, language: "nl" },
		translation: { translation: `translation ${index + 1}`, language: "ru" },
	}));
	let value;
	let failed = 0;
	let loadGate;
	let loads = 0;
	let refreshTask;
	const context = React.createContext(null);
	const { TypeWordExercise } = loadSource(
		"features/training/components/exercises/TypeWordExercise.tsx",
		{
			"react-native": {
				...native,
				Animated,
				Text: "Text",
				TextInput: "TextInput",
				Platform: {
					OS: "ios",
					select: (values) => values.ios ?? values.default,
				},
				useWindowDimensions: () => ({ width: 400 }),
				Easing: { in: (x) => x, out: (x) => x, ease: (x) => x },
			},
			"react-i18next": translation,
			"@/mob-ui": ui,
			"@/shared/vocabulary/useAcceptedAnswers": {
				useAcceptedAnswers: () => [],
			},
			"@/features/training/components/ExerciseProvider": {
				ExerciseContext: context,
			},
			"@/shared/training/events": { ExerciseContext: context },
			"@/features/training/components/WordExcerciseResult": {
				WordExcerciseCardResultModal: "Modal",
			},
			"@/features/training/components/exercises/TrainingPromptCard": {
				TrainingPromptCard: "Prompt",
			},
		},
	);
	function Screen() {
		const [wordsPool, setPool] = React.useState({
			currentPairs: [pairs[0]],
			taskKey: "1:0",
		});
		refreshTask = () =>
			setPool((pool) => ({ ...pool, currentPairs: [...pool.currentPairs] }));
		const cursor = React.useRef(-1);
		const loadData = React.useCallback(async () => {
			loads++;
			if (loadGate) await loadGate.promise;
			cursor.current++;
			setPool({
				currentPairs: [pairs[cursor.current % pairs.length]],
				taskKey: `1:${cursor.current}`,
			});
		}, []);
		const events = React.useMemo(
			() => ({
				loadData,
				addCompleteListener: (fn) => listeners.add(fn),
				removeCompleteListener: (fn) => listeners.delete(fn),
				onFailure: () => {
					failed++;
				},
				onSuccess() {},
				triggerLike() {},
				complete: () => {
					for (const listener of listeners) listener();
				},
			}),
			[loadData],
		);
		value = {
			...events,
			wordsPool,
		};
		return React.createElement(
			context.Provider,
			{ value },
			React.createElement(TypeWordExercise),
		);
	}
	return {
		Screen,
		refresh: () => refreshTask(),
		get loads() {
			return loads;
		},
		delayNextLoad() {
			loadGate = deferred();
			return loadGate;
		},
		get failures() {
			return failed;
		},
		complete: () => value.complete(),
		async flushAnimations() {
			await act(async () => {
				while (jobs.length) jobs.shift()();
			});
		},
	};
}

function assertVisible(node) {
	for (let ancestor = node; ancestor; ancestor = ancestor.parent) {
		const styles = [ancestor.props.style].flat(Infinity).filter(Boolean);
		for (const style of styles) {
			if (style.opacity != null)
				assert.equal(style.opacity.value ?? style.opacity, 1);
			for (const transform of style.transform ?? []) {
				if (transform.translateX != null)
					assert.equal(transform.translateX.value ?? transform.translateX, 0);
			}
		}
	}
}

test("writing opens with a visible prompt and every cell even when native animations never finish", async () => {
	const app = setup(["goedemorgen"]);
	const tree = await mount(app.Screen);
	assertVisible(tree.root.findByType("Prompt"));
	const cells = tree.root.findAllByType("Pressable");
	assert.equal(cells.length, 11);
	for (const cell of cells) assertVisible(cell);
	await act(async () => tree.unmount());
});

test("a correct answer advances without waiting for any native animation callback", async () => {
	const app = setup(["gezin", "goedemorgen"]);
	const tree = await mount(app.Screen);
	await act(async () =>
		tree.root.findByType("TextInput").props.onChangeText("gezin"),
	);
	assert.equal(tree.root.findByType("Prompt").props.word, "translation 2");
	assertVisible(tree.root.findByType("Prompt"));
	for (const cell of tree.root.findAllByType("Pressable")) {
		assertVisible(cell);
		assert.equal(cell.findByType("Text").children.length, 0);
	}
	await act(async () => tree.unmount());
});

test("writing shows the prompt again when a failed last unfinished word is retried with the same models", async () => {
	const app = setup();
	const tree = await mount(app.Screen);
	await act(async () =>
		tree.root.findByType("TextInput").props.onChangeText("zzz"),
	);
	assert.equal(app.failures, 1);
	await act(async () => app.complete());
	assertVisible(tree.root.findByType("Prompt"));
	assert.equal(tree.root.findByType("TextInput").props.maxLength, 5);
	assert.equal(
		tree.root
			.findAllByType("Pressable")
			.filter((node) => node.props.testID?.startsWith("pin-input-")).length,
		5,
	);
	await act(async () => tree.unmount());
});

test("writing resets the answer and renders every cell of the next word after exhausting attempts", async () => {
	const app = setup(["gezin", "goedemorgen"]);
	const tree = await mount(app.Screen);
	await act(async () =>
		tree.root.findByType("TextInput").props.onChangeText("zzz"),
	);
	await act(async () => app.complete());
	assert.equal(app.failures, 1);
	assert.equal(tree.root.findByType("Prompt").props.word, "translation 2");
	assert.equal(tree.root.findByType("TextInput").props.maxLength, 11);
	const cells = tree.root
		.findAllByType("AnimatedView")
		.filter((node) => node.props.style?.opacity);
	assert.equal(cells.length, 11);
	assert.ok(cells.every((cell) => cell.props.style.opacity.value === 1));
	assertVisible(tree.root.findByType("Prompt"));
	await act(async () => tree.unmount());
});

test("repeated skips keep every next writing prompt visible, including reused words", async () => {
	const app = setup(["gezin", "goedemorgen", "melk"]);
	const tree = await mount(app.Screen);
	for (let index = 0; index < 15; index++) {
		await act(async () => tree.root.findByType("Prompt").props.onSkip());
		assert.equal(tree.root.findByType("Modal").props.visible, true);
		await act(async () => tree.root.findByType("Modal").props.onRequestClose());
		const prompt = tree.root.findByType("Prompt");
		assert.equal(prompt.props.word, `translation ${((index + 1) % 3) + 1}`);
		assertVisible(prompt);
		for (const cell of tree.root.findAllByType("Pressable"))
			assertVisible(cell);
		const cells = tree.root
			.findAllByType("Pressable")
			.filter((node) => node.props.testID?.startsWith("pin-input-"));
		assert.ok(
			cells.every((cell) => cell.findByType("Text").children.length === 0),
		);
	}
	assert.equal(app.failures, 15);
	await act(async () => tree.unmount());
});

test("a delayed next task keeps the prompt visible and ignores repeated skip/close events", async () => {
	const app = setup(["gezin", "goedemorgen"]);
	const tree = await mount(app.Screen);
	await act(async () =>
		tree.root.findByType("TextInput").props.onChangeText("ge"),
	);
	const gate = app.delayNextLoad();
	const skip = tree.root.findByType("Prompt").props.onSkip;
	await act(async () => {
		skip();
		skip();
	});
	const close = tree.root.findByType("Modal").props.onRequestClose;
	await act(async () => {
		close();
		close();
	});
	assert.equal(app.failures, 1);
	assert.equal(app.loads, 2);
	assert.equal(tree.root.findByType("Prompt").props.word, "translation 1");
	assertVisible(tree.root.findByType("Prompt"));
	assert.equal(tree.root.findByType("TextInput").props.editable, false);
	assert.equal(
		tree.root.findAllByType("Pressable")[0].findByType("Text").children[0],
		"g",
	);
	await act(async () => gate.resolve());
	assert.equal(tree.root.findByType("Prompt").props.word, "translation 2");
	assert.equal(tree.root.findByType("TextInput").props.editable, true);
	for (const cell of tree.root.findAllByType("Pressable")) {
		assertVisible(cell);
		assert.equal(cell.findByType("Text").children.length, 0);
	}
	await act(async () => tree.unmount());
});

test("republishing the same task preserves a partially typed answer", async () => {
	const app = setup();
	const tree = await mount(app.Screen);
	await act(async () =>
		tree.root.findByType("TextInput").props.onChangeText("ge"),
	);
	await act(async () => app.refresh());
	const letters = tree.root
		.findAllByType("Pressable")
		.map((cell) => cell.findByType("Text").children.join(""));
	assert.deepEqual(letters, ["g", "e", "", "", ""]);
	assertVisible(tree.root.findByType("Prompt"));
	await act(async () => tree.unmount());
});
