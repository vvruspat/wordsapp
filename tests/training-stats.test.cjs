const assert = require("node:assert/strict");
const { test } = require("node:test");
const { BehaviorSubject } = require("rxjs");
const { act, loadSource, mount, translation } = require("./helpers.cjs");

test("training menu counts mastered words and drops a previously mastered word after failure", async () => {
	const words = new BehaviorSubject([{ remoteId: 1 }, { remoteId: 2 }]);
	const progress = new BehaviorSubject([
		{ wordId: 1, training: "cards", score: 0.2 },
		{ wordId: 1, training: "cards", score: 0.4 },
		{ wordId: 2, training: "cards", score: 0 },
		{ wordId: 99, training: "cards", score: 0.2 },
		{ wordId: 2, training: "intro", score: 1 },
	]);
	const database = {
		get: (table) => ({
			query: () => ({
				observe: () => words,
				observeWithColumns: () =>
					table === "learning_progress" ? progress : words,
			}),
		}),
	};
	const { useSelectionStore } = loadSource(
		"shared/selection/selectionStore.ts",
	);
	const { useTrainingCatalogStats } = loadSource(
		"features/training/hooks/useTrainingCatalogStats.ts",
		{
			"@nozbe/watermelondb": { Q: { where() {}, oneOf() {} } },
			"@nozbe/watermelondb/hooks": { useDatabase: () => database },
			"@/shared/selection/selectionStore": { useSelectionStore },
			"@/shared/session/useSession": {
				useSessionUser: () => ({ user: { userId: 1, language_learn: "nl" } }),
			},
			"@/shared/audio/useAudioReadiness": {
				useAudioReadiness: () => ({ isAudioReady: true }),
			},
			"react-i18next": translation,
		},
	);
	let stats;
	function Probe() {
		stats = useTrainingCatalogStats().trainingStats;
		return null;
	}
	const tree = await mount(Probe);
	assert.deepEqual(stats.cards, { successCount: 1, totalCount: 2 });
	assert.equal(stats.type_word.successCount, 0);
	await act(async () =>
		progress.next([{ wordId: 1, training: "cards", score: 0 }]),
	);
	assert.deepEqual(stats.cards, { successCount: 0, totalCount: 2 });
	await act(async () => tree.unmount());
});
