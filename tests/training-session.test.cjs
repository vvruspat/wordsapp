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
	const session = new TrainingSession([1], ["cards", "type_word"], saved);
	assert.deepEqual(session.remaining(), ["type_word"]);
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

test("typed answers preserve prefix, case/space normalization and same-length alternative policy", () => {
	const { evaluateTypedAnswer, isAcceptedTranslation } = loadSource(
		"features/training/model/answers.ts",
	);
	assert.equal(evaluateTypedAnswer(" C ", "Cat", []), "default");
	assert.equal(evaluateTypedAnswer(" CAT ", "Cat", []), "success");
	assert.equal(evaluateTypedAnswer("dog", "cat", ["dog", "kitten"]), "success");
	assert.equal(evaluateTypedAnswer("kitten", "cat", ["kitten"]), "error");
	assert.equal(evaluateTypedAnswer("rat", "cat", []), "error");
	assert.equal(isAcceptedTranslation("cat", "cat", []), true);
});

test("an unfinished word stays ahead of mastered words after failure, with matching fillers only after it", () => {
	const session = new TrainingSession(
		[1, 2, 3],
		["cards"],
		[
			{ wordId: 2, training: "cards", score: 0.2 },
			{ wordId: 3, training: "cards", score: 0.2 },
		],
	);
	const step = session.select("cards", 1);
	assert.deepEqual(step.wordIds, [1]);
	session.apply(step.id, 1, false);
	const retry = session.select("cards", 1);
	assert.deepEqual(
		retry.wordIds,
		[1],
		"repeat the unfinished word even when mastered alternatives were not served last",
	);
	session.apply(retry.id, 1, false);
	const matching = session.select("cards", 4);
	assert.equal(matching.wordIds[0], 1);
	assert.deepEqual(new Set(matching.wordIds), new Set([1, 2, 3]));
});

test("switching exercises leaves the single review pass and restores durable coverage including review results", () => {
	const session = new TrainingSession(
		[1, 2],
		["cards"],
		[
			{ wordId: 1, training: "cards", score: 0.2 },
			{ wordId: 1, training: "type_word", score: 0.2 },
		],
	);
	session.startReview("cards");
	assert.deepEqual(session.remaining(), ["cards"]);
	assert.throws(() => session.select("type_word", 1), /leaving a review/);
	let step = session.select("cards", 1);
	session.apply(step.id, 1, false);
	step = session.select("cards", 1);
	assert.deepEqual(step.wordIds, [2]);
	session.apply(step.id, 2, true);
	session.configureTrainings(["type_word"]);
	assert.equal(session.mastered("type_word"), 1);
	assert.deepEqual(session.remaining(), ["type_word"]);
	assert.equal(session.status, "ready");
	assert.equal(session.currentStep, null);
	step = session.select("type_word", 1);
	assert.deepEqual(step.wordIds, [2]);
	session.apply(step.id, 2, true);
	assert.equal(session.status, "completed");
	session.configureTrainings(["cards"]);
	assert.equal(session.mastered("cards"), 1);
	assert.equal(session.hasMastered(1, "cards"), false);
	assert.equal(session.hasMastered(2, "cards"), true);
	assert.deepEqual(session.remaining(), ["cards"]);
});

test("refreshing durable progress during a review preserves pass coverage and is used after switching", () => {
	const session = new TrainingSession([1], ["cards"], []);
	session.startReview("cards");
	session.refresh([{ wordId: 1, training: "type_word", score: 0.2 }]);
	assert.equal(session.mastered("cards"), 0);
	assert.equal(session.status, "ready");
	session.configureTrainings(["type_word"]);
	assert.equal(session.mastered("type_word"), 1);
	assert.equal(session.status, "completed");
});
