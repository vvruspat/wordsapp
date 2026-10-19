const assert = require("node:assert/strict");
const { test } = require("node:test");
const {
	React,
	act,
	loadSource,
	deferred,
	mount,
	translation,
	logger,
} = require("./helpers.cjs");
test("detail requests and completion from another user cannot replace an open session", async () => {
	let user = { userId: 1 };
	let value;
	const gate = deferred();
	const remote = (id) => ({
		session: { id },
		threads: [],
		messages: [],
		corrections: [],
	});
	const { useDialogueDetail } = loadSource(
		"features/dialogues/hooks/useDialogueDetail.ts",
		{
			"@/hooks/useSession": { useSessionUser: () => ({ user }) },
			"react-i18next": translation,
			"@/utils/logger": { logger },
			"@react-native-community/netinfo": {
				fetch: async () => ({ isConnected: true }),
			},
			"../api/dialogues": {
				getDialogueDetail: async (id) =>
					id === "old" ? gate.promise : remote(id),
				completeDialogue: async () => ({}),
			},
			"../services/dialogueCache": {
				dialogueCacheRepository: {
					get: async () => null,
					upsert: async () => {},
				},
			},
		},
	);
	function Probe({ id }) {
		value = useDialogueDetail(id);
		return null;
	}
	const tree = await mount(Probe, { id: "old" });
	user = { userId: 2 };
	await act(async () => tree.update(React.createElement(Probe, { id: "new" })));
	assert.equal(value.detail.session.id, "new");
	await act(async () => gate.resolve(remote("old")));
	assert.equal(value.detail.session.id, "new");
	await act(async () => tree.unmount());
});
