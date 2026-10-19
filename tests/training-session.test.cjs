const assert = require("node:assert/strict");
const { test } = require("node:test");
const { loadSource } = require("./helpers.cjs");
const { TrainingSession } = loadSource("features/training/model/session.ts");
test("single and mixed share coverage, fixed selection and idempotent steps", () => {
	const session = new TrainingSession(
		[1, 2],
		["cards", "type_word"],
		[{ wordId: 1, training: "cards", score: 0.2 }],
	);
	const step = session.select("cards", 1);
	assert.deepEqual(step.wordIds, [2]);
	assert.equal(session.select("cards", 1).id, step.id);
	assert.equal(session.apply(step.id, 2, true), true);
	assert.equal(session.apply(step.id, 2, false), false);
	assert.deepEqual(session.remaining(), ["type_word"]);
	assert.deepEqual(session.wordIds, [1, 2]);
});
test("explicit review tracks its own coverage without resetting persisted scores", () => {
	const saved = [{ wordId: 1, training: "cards", score: 0.2 }];
	const session = new TrainingSession([1], ["cards"], saved);
	assert.equal(session.status, "completed");
	session.startReview("cards");
	assert.deepEqual(session.remaining(), ["cards"]);
	assert.equal(
		session.nextTraining(() => 0.99),
		"cards",
	);
	session.refresh(saved);
	assert.equal(session.status, "ready");
	const step = session.select("cards", 1);
	session.apply(step.id, 1, false);
	assert.equal(session.status, "ready");
	const retry = session.select("cards", 1);
	session.apply(retry.id, 1, true);
	assert.equal(session.status, "completed");
	assert.equal(saved[0].score, 0.2);
});
test("matching keeps one step across individual answers and rejects stale delivery", () => {
	const s = new TrainingSession([1, 2], ["match_words"], []);
	const step = s.select("match_words", 4);
	s.apply(step.id, 1, true);
	assert.equal(s.select("match_words", 4).id, step.id);
	s.apply(step.id, 2, true);
	const next = s.select("match_words", 4);
	assert.equal(s.apply(step.id, 1, false), false);
	assert.notEqual(next.id, step.id);
});
