const assert = require("node:assert/strict");
const { test } = require("node:test");
const core = require("@assistant-ui/core/react");
const { useAuiState } = require("@assistant-ui/store");
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

const correction = {
	id: "correction",
	session_id: "session",
	original: "go",
	corrected: "went",
};
const thread = { id: "branch", correction_id: correction.id };
const message = (id, content, sequence = 1) => ({
	id,
	content,
	sequence,
	thread_id: thread.id,
	role: "assistant",
	created_at: "2026-10-19T10:00:00Z",
});
const explanation = {
	correction,
	thread,
	messages: [message("explanation", "Use the past tense.")],
};
const cachedDetail = (messages = []) => ({
	session: { id: "session" },
	corrections: [correction],
	threads: [thread],
	messages,
});

function setup({
	cached = null,
	remote = async () => explanation,
	cacheError,
	platform = "ios",
	send = async () => {},
} = {}) {
	let runtime;
	let requests = 0;
	let online = true;
	const params = { correctionId: correction.id };
	const cache = {
		list: async () => {
			if (cacheError) throw cacheError;
			return cached ? [cached] : [];
		},
		get: async () => cached,
		upsert: async () => {},
	};
	function Messages({ children }) {
		const messages = useAuiState((state) => state.thread.messages);
		return React.createElement(
			"Messages",
			null,
			messages.map((item) =>
				React.createElement(
					React.Fragment,
					{ key: item.id },
					children({ message: item }),
				),
			),
		);
	}
	const { default: Screen } = loadSource(
		"features/dialogues/screens/CorrectionBranchScreen.tsx",
		{
			"@assistant-ui/react-native": {
				AssistantRuntimeProvider: core.AssistantRuntimeProvider,
				useLocalRuntime: (...args) => {
					runtime = core.useLocalRuntime(...args);
					return runtime;
				},
				ComposerPrimitive: { Root: "Composer", Input: "Input", Send: "Send" },
				ThreadPrimitive: { Root: "Thread", MessagesFlatList: Messages },
			},
			"react-native": { ...native, Platform: { OS: platform } },
			"react-i18next": translation,
			"expo-router": {
				useLocalSearchParams: () => params,
				useRouter: () => ({ back() {} }),
			},
			"@expo/vector-icons/FontAwesome5": "Icon",
			"@react-native-community/netinfo": {
				fetch: async () => ({ isConnected: online }),
				addEventListener: () => () => {},
			},
			"@/features/dialogues/api/dialogues": {
				sendBranchMessage: send,
				openCorrectionBranch: (...args) => {
					requests += 1;
					return remote(...args);
				},
			},
			"@/features/dialogues/components/TappableText": {
				TappableText: ({ text }) => React.createElement("Text", null, text),
			},
			"@/features/dialogues/components/VocabularyResultCard": {
				VocabularyResultCard: "Notice",
			},
			"@/features/dialogues/services/dialogueCache": {
				dialogueCacheRepository: cache,
			},
			"@/shared/vocabulary/integrateDialogueVocabulary": {
				dialogueVocabularyRepository: {},
			},
			"@/hooks/useSession": { useSessionUser: () => ({ user: { userId: 1 } }) },
			"@/mob-ui": ui,
			"@/mob-ui/brand/colors": { Colors },
			"@/utils/logger": { logger },
		},
	);
	return {
		Screen,
		params,
		get runtime() {
			return runtime;
		},
		get requests() {
			return requests;
		},
		setOffline: () => {
			online = false;
		},
	};
}

const textOf = (tree) => JSON.stringify(tree.toJSON());

test("first opening publishes a delayed explanation without reopening", async () => {
	const pending = deferred();
	const app = setup({
		cached: { ...cachedDetail(), threads: [] },
		remote: () => pending.promise,
	});
	const tree = await mount(app.Screen);
	assert.equal(tree.root.findAllByType("ActivityIndicator").length, 1);
	await act(async () => pending.resolve(explanation));
	assert.match(textOf(tree), /Use the past tense/);
	assert.equal(tree.root.findAllByType("ActivityIndicator").length, 0);
	assert.equal(app.requests, 1);
	await act(async () => tree.unmount());
});

test("a remote refresh updates an already mounted real assistant runtime", async () => {
	const pending = deferred();
	const app = setup({
		cached: cachedDetail([message("old", "Cached explanation.")]),
		remote: () => pending.promise,
	});
	const tree = await mount(app.Screen);
	assert.match(textOf(tree), /Cached explanation/);
	const runtime = app.runtime;
	await act(async () =>
		runtime.thread.composer.setText("My unfinished question"),
	);
	await act(async () =>
		pending.resolve({
			...explanation,
			messages: [
				message("old", "Cached explanation."),
				message("new", "Fresh details.", 2),
			],
		}),
	);
	assert.equal(app.runtime, runtime);
	assert.match(textOf(tree), /Fresh details/);
	assert.equal(
		runtime.thread.composer.getState().text,
		"My unfinished question",
	);
	await act(async () => tree.unmount());
});

test("a first request failure with only a cached parent shows retry and can recover", async () => {
	let fail = true;
	const app = setup({
		cached: { ...cachedDetail(), threads: [] },
		remote: async () => {
			if (fail) throw new Error("Request failed");
			return explanation;
		},
	});
	const tree = await mount(app.Screen);
	assert.match(textOf(tree), /Request failed/);
	assert.equal(tree.root.findAllByType("ActivityIndicator").length, 0);
	fail = false;
	await act(async () =>
		tree.root.findAllByType("Pressable").at(-1).props.onPress(),
	);
	assert.match(textOf(tree), /Use the past tense/);
	await act(async () => tree.unmount());
});

test("syncing branch props during a reply preserves the running assistant response", async () => {
	const pending = deferred();
	const app = setup({ send: () => pending.promise });
	const tree = await mount(app.Screen);
	await act(async () => {
		app.runtime.thread.append("Why?");
	});
	assert.equal(app.runtime.thread.getState().isRunning, true);
	const userMessage = { ...message("question", "Why?", 2), role: "user" };
	await act(async () =>
		pending.resolve({
			userMessage,
			assistantMessage: message("reply", "It happened yesterday.", 3),
			addedWords: [],
		}),
	);
	assert.equal(app.runtime.thread.getState().isRunning, false);
	assert.equal(app.runtime.thread.getState().messages.length, 3);
	assert.match(textOf(tree), /It happened yesterday/);
	await act(async () => tree.unmount());
});

test("a late response from a different correction cannot replace the open explanation", async () => {
	const first = deferred();
	const second = {
		...explanation,
		correction: { ...correction, id: "other" },
		thread: { ...thread, id: "other-thread", correction_id: "other" },
		messages: [
			{
				...message("other-message", "Different correction."),
				thread_id: "other-thread",
			},
		],
	};
	const app = setup({
		remote: async (id) => (id === "other" ? second : first.promise),
	});
	const tree = await mount(app.Screen);
	app.params.correctionId = "other";
	await act(async () => tree.update(React.createElement(app.Screen)));
	assert.match(textOf(tree), /Different correction/);
	await act(async () => first.resolve(explanation));
	assert.match(textOf(tree), /Different correction/);
	assert.doesNotMatch(textOf(tree), /Use the past tense/);
	await act(async () => tree.unmount());
});

test("a broken cache does not block the remote explanation", async () => {
	const app = setup({ cacheError: new Error("SQLite read failed") });
	const tree = await mount(app.Screen);
	assert.match(textOf(tree), /Use the past tense/);
	await act(async () => tree.unmount());
});

test("empty remote branches and offline uncached branches show an error, not a blank thread", async () => {
	for (const offline of [false, true]) {
		const app = setup({
			cached: cachedDetail(),
			remote: async () => ({ ...explanation, messages: [] }),
		});
		if (offline) app.setOffline();
		const tree = await mount(app.Screen);
		assert.match(
			textOf(tree),
			offline ? /dialogue_branch_not_cached/ : /dialogue_branch_error/,
		);
		assert.equal(tree.root.findAllByType("Thread").length, 0);
		assert.equal(tree.root.findAllByType("ActivityIndicator").length, 0);
		await act(async () => tree.unmount());
	}
});

test("effect restarts reuse the in-flight creation request", async () => {
	const pending = deferred();
	const app = setup({ remote: () => pending.promise });
	const first = await mount(app.Screen);
	await act(async () => first.unmount());
	const second = await mount(app.Screen);
	assert.equal(app.requests, 1);
	await act(async () => pending.resolve(explanation));
	assert.match(textOf(second), /Use the past tense/);
	await act(async () => second.unmount());
});

test("correction composer is inside the keyboard avoidance container on both platforms", async () => {
	for (const platform of ["ios", "android"]) {
		const app = setup({ platform });
		const tree = await mount(app.Screen);
		const container = tree.root.findByType("KeyboardAvoidingView");
		assert.equal(
			container.props.behavior,
			platform === "ios" ? "padding" : "height",
		);
		assert.equal(container.findAllByType("Input").length, 1);
		await act(async () => tree.unmount());
	}
});
