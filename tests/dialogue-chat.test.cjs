const assert = require("node:assert/strict");
const { test } = require("node:test");
const core = require("@assistant-ui/core/react");
const { useAuiState } = require("@assistant-ui/store");
const {
	React,
	act,
	loadSource,
	mount,
	deferred,
	native,
	ui,
	translation,
	logger,
} = require("./helpers.cjs");

const message = (id, content, sequence, role = "assistant") => ({
	id,
	content,
	sequence,
	role,
	thread_id: "main",
	created_at: "2026-10-20T10:00:00Z",
	metadata: {},
});
const initial = {
	session: { id: "session", status: "active", turn_count: 0, max_turns: 12 },
	threads: [{ id: "main", kind: "main" }],
	messages: [message("opening", "Goedemorgen!", 1)],
	corrections: [],
};
const reply = {
	session: { ...initial.session, turn_count: 1 },
	userMessage: message("saved-user", "koffie", 2, "user"),
	assistantMessage: message("saved-reply", "Welke maat?", 3),
	corrections: [],
	addedWords: [],
};
const textOf = (node) => {
	if (typeof node === "string") return node;
	if (Array.isArray(node)) return node.map(textOf).join("");
	return node ? textOf(node.children) : "";
};

function setup(send) {
	let runtime;
	let renders = 0;
	const sent = [];
	const drafts = [];
	const oldFetch = global.fetch;
	const oldUrl = process.env.EXPO_PUBLIC_API_URL;
	process.env.EXPO_PUBLIC_API_URL = "http://local.test";
	global.fetch = async (_url, request) => {
		const body = JSON.parse(request.body);
		sent.push(body);
		assert.ok(body.clientMessageId.length >= 8);
		const result = await send(body, sent.length);
		return { ok: true, status: 201, text: async () => JSON.stringify(result) };
	};
	const FlatList = React.forwardRef(({ data, renderItem }, ref) => {
		assert.ok(
			++renders < 100,
			"message updates must settle instead of looping",
		);
		React.useImperativeHandle(ref, () => ({ scrollToOffset() {} }), []);
		return React.createElement(
			"Messages",
			null,
			data.map((item, index) =>
				React.createElement(
					React.Fragment,
					{ key: item.id },
					renderItem({ item, index }),
				),
			),
		);
	});
	function Pressable({ children, ...props }) {
		const [pressed, setPressed] = React.useState(false);
		return React.createElement(
			"Pressable",
			{
				...props,
				onPressIn: () => setPressed(true),
				onPressOut: () => setPressed(false),
			},
			typeof children === "function" ? children({ pressed }) : children,
		);
	}
	const mocks = {
		"react-native": {
			...native,
			Pressable,
			FlatList,
			Text: "Text",
			TextInput: "Input",
		},
		"react-i18next": translation,
		"expo-router": { useRouter: () => ({ push() {}, replace() {} }) },
		"@expo/vector-icons/FontAwesome5": "Icon",
		"@react-native-community/netinfo": { addEventListener: () => () => {} },
		"@/features/dialogues/services/dialogueCache": {
			dialogueCacheRepository: {
				getDraft: async () => "",
				setDraft: async (...args) => drafts.push(args),
				upsert: async () => {},
			},
		},
		"@/shared/vocabulary/integrateDialogueVocabulary": {
			dialogueVocabularyRepository: { integrate: async () => {} },
		},
		"@/utils/authTokenStorage": { getAccessToken: async () => "test-token" },
		"@/mob-ui": ui,
		"@/utils/logger": { logger },
	};
	const { ThreadMessagesFlatList } = loadSource(
		"node_modules/@assistant-ui/react-native/src/primitives/thread/ThreadMessages.tsx",
		mocks,
	);
	const { ComposerSend } = loadSource(
		"node_modules/@assistant-ui/react-native/src/primitives/composer/ComposerSend.tsx",
		mocks,
	);
	const { ComposerInput } = loadSource(
		"node_modules/@assistant-ui/react-native/src/primitives/composer/ComposerInput.tsx",
		mocks,
	);
	mocks["@assistant-ui/react-native"] = {
		AssistantRuntimeProvider: core.AssistantRuntimeProvider,
		useAuiState,
		useLocalRuntime: (...args) => {
			runtime = core.useLocalRuntime(...args);
			return runtime;
		},
		ComposerPrimitive: {
			Root: "Composer",
			Input: ComposerInput,
			Send: ComposerSend,
		},
		ThreadPrimitive: {
			Root: "Thread",
			MessagesFlatList: ThreadMessagesFlatList,
		},
	};
	const { DialogueChat } = loadSource(
		"features/dialogues/components/DialogueChat.tsx",
		mocks,
	);
	function Screen() {
		const [detail, setDetail] = React.useState(initial);
		return React.createElement(DialogueChat, {
			detail,
			userId: 1,
			onDetailChange: setDetail,
		});
	}
	return {
		Screen,
		sent,
		drafts,
		get runtime() {
			return runtime;
		},
		sendButton(tree) {
			return tree.root
				.findAllByType("Pressable")
				.find((node) => node.props.style?.width === 46);
		},
		restore() {
			global.fetch = oldFetch;
			if (oldUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL;
			else process.env.EXPO_PUBLIC_API_URL = oldUrl;
		},
	};
}

test("one send tap preserves its touch target and submits through the native composer without resetting the runtime", async () => {
	const response = deferred();
	const app = setup(() => response.promise);
	let tree;
	try {
		tree = await mount(app.Screen);
		const runtime = app.runtime;
		assert.equal(
			app.sendButton(tree).props.disabled,
			true,
			"an empty message must not be sendable",
		);
		await act(async () =>
			tree.root.findByType("Input").props.onChangeText("koffie"),
		);
		assert.equal(app.sendButton(tree).props.disabled, false);
		const arrow = app.sendButton(tree).findByType("Icon");
		await act(async () => app.sendButton(tree).props.onPressIn());
		assert.equal(app.sent.length, 0);
		assert.equal(
			app.sendButton(tree).findAllByType("ActivityIndicator").length,
			0,
			"touch-down is not a request and must not replace the tapped icon with loading",
		);
		assert.equal(app.sendButton(tree).findByType("Icon"), arrow);
		await act(async () => app.sendButton(tree).props.onPressOut());
		await act(async () => app.sendButton(tree).props.onPress());
		assert.equal(app.sent.length, 1, "the first tap must reach the transport");
		assert.equal(runtime.thread.getState().isRunning, true);
		assert.equal(
			app.sendButton(tree).props.disabled,
			true,
			"a pending response must block duplicate sends",
		);
		assert.equal(
			app.sendButton(tree).findAllByType("ActivityIndicator").length,
			1,
		);
		await act(async () => response.resolve(reply));
		assert.equal(app.runtime, runtime);
		assert.equal(runtime.thread.getState().isRunning, false);
		assert.equal(runtime.thread.getState().messages.length, 3);
		assert.match(textOf(tree.toJSON()), /Welke maat/);
		assert.equal(tree.root.findAllByType("ActivityIndicator").length, 0);
		assert.equal(app.sent.length, 1);
		assert.ok(
			app.drafts.length < 20,
			"a reply must not generate an unbounded draft-write loop",
		);
	} finally {
		if (tree) await act(async () => tree.unmount());
		app.restore();
	}
});

test("a failed dialogue reply shows retry and reuses the original client message key", async () => {
	const app = setup(async (_body, attempt) => {
		if (attempt === 1) throw new Error("Offline");
		return reply;
	});
	let tree;
	try {
		tree = await mount(app.Screen);
		await act(async () => app.runtime.thread.append("koffie"));
		assert.equal(app.runtime.thread.getState().isRunning, false);
		assert.match(JSON.stringify(tree.toJSON()), /dialogue_reply_error/);
		const retry = tree.root
			.findAllByType("Pressable")
			.find((node) =>
				node
					.findAllByType("Text")
					.some((label) => label.children.includes("button_retry")),
			);
		assert.ok(retry);
		await act(async () => retry.props.onPress());
		assert.equal(app.sent.length, 2);
		assert.equal(app.sent[0].clientMessageId, app.sent[1].clientMessageId);
		assert.equal(app.runtime.thread.getState().messages.length, 3);
		assert.match(textOf(tree.toJSON()), /Welke maat/);
		assert.doesNotMatch(JSON.stringify(tree.toJSON()), /dialogue_reply_error/);
	} finally {
		if (tree) await act(async () => tree.unmount());
		app.restore();
	}
});
