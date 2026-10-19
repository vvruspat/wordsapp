const assert = require("node:assert/strict");
const { test } = require("node:test");
const { loadSource, deferred } = require("./helpers.cjs");
test("progress writes serialize each user/word/exercise read-modify-write without blocking another exercise", async () => {
	const gate = deferred(),
		calls = [];
	const { progressService } = loadSource("shared/progress/progressService.ts", {
		"@/db/repositories/learning.repository": {
			learningRepository: {
				recordResult: async (input) => {
					calls.push(input.trainingId);
					if (input.trainingId === "cards") await gate.promise;
				},
			},
		},
	});
	const input = { userId: 1, wordId: 2, scoreDelta: 0.2, result: "success" };
	const first = progressService.record({ ...input, trainingId: "cards" }),
		second = progressService.record({ ...input, trainingId: "cards" }),
		other = progressService.record({ ...input, trainingId: "type_word" });
	await other;
	assert.deepEqual(calls, ["cards", "type_word"]);
	gate.resolve();
	await Promise.all([first, second]);
	assert.deepEqual(calls, ["cards", "type_word", "cards"]);
});
