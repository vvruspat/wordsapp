const assert = require("node:assert/strict");
const { test } = require("node:test");
const {
	React,
	act,
	loadSource,
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
		const [currentPairs, setPairs] = React.useState([pairs[0]]);
		const cursor = React.useRef(-1);
		const loadData = React.useCallback(async () => {
			cursor.current++;
			setPairs([pairs[cursor.current % pairs.length]]);
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
		value = { ...events, wordsPool: { currentPairs } };
		return React.createElement(
			context.Provider,
			{ value },
			React.createElement(TypeWordExercise),
		);
	}
	return {
		Screen,
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

test("writing shows the prompt again when a failed last unfinished word is retried with the same models", async () => {
	const app = setup();
	const tree = await mount(app.Screen);
	await app.flushAnimations();
	await act(async () =>
		tree.root.findByType("TextInput").props.onChangeText("zzz"),
	);
	assert.equal(app.failures, 1);
	await act(async () => app.complete());
	await app.flushAnimations();
	await app.flushAnimations();
	const card = tree.root.findByType("Prompt").parent;
	assert.equal(
		card.props.style[1].transform[0].translateX.value,
		0,
		"the next prompt must be on screen even when the word object is reused",
	);
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
	await app.flushAnimations();
	await act(async () =>
		tree.root.findByType("TextInput").props.onChangeText("zzz"),
	);
	await act(async () => app.complete());
	await app.flushAnimations();
	await app.flushAnimations();
	assert.equal(app.failures, 1);
	assert.equal(tree.root.findByType("Prompt").props.word, "translation 2");
	assert.equal(tree.root.findByType("TextInput").props.maxLength, 11);
	const cells = tree.root
		.findAllByType("AnimatedView")
		.filter((node) => node.props.style?.opacity);
	assert.equal(cells.length, 11);
	assert.ok(cells.every((cell) => cell.props.style.opacity.value === 1));
	assert.equal(
		tree.root.findByType("Prompt").parent.props.style[1].transform[0].translateX
			.value,
		0,
	);
	await act(async () => tree.unmount());
});
