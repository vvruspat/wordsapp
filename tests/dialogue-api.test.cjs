const assert = require("node:assert/strict");
const { test } = require("node:test");
const { loadSource } = require("./helpers.cjs");

test("main and branch sends adapt seven-character runtime IDs to the API contract and keep retries idempotent", async () => {
	const previousUrl = process.env.EXPO_PUBLIC_API_URL;
	process.env.EXPO_PUBLIC_API_URL = "http://local.test";
	const fetchBefore = global.fetch;
	const requests = [];
	global.fetch = async (_url, request) => {
		const body = JSON.parse(request.body);
		requests.push(body);
		assert.ok(body.clientMessageId.length >= 8);
		assert.ok(body.clientMessageId.length <= 100);
		return { ok: true, text: async () => "{}" };
	};
	try {
		const api = loadSource("features/dialogues/api/dialogues.ts", {
			"@/utils/authTokenStorage": { getAccessToken: async () => "test-token" },
		});
		for (const send of [api.sendDialogueMessage, api.sendBranchMessage]) {
			await send("thread", "Hallo", "Abc1234");
			await send("thread", "Hallo", "Abc1234");
			assert.equal(
				requests.at(-1).clientMessageId,
				requests.at(-2).clientMessageId,
			);
			await send("thread", "Hallo", "existing-message-identifier");
			assert.equal(
				requests.at(-1).clientMessageId,
				"existing-message-identifier",
			);
		}
	} finally {
		global.fetch = fetchBefore;
		if (previousUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL;
		else process.env.EXPO_PUBLIC_API_URL = previousUrl;
	}
});
