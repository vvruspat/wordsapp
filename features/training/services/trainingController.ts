import { createStore } from "zustand/vanilla";
import type {
	ExerciseId,
	LearningTrainingName,
} from "@/shared/progress/exercises";
import { progressService } from "@/shared/progress/progressService";
import type { WordPair } from "@/shared/vocabulary/wordsService";
import type Word from "@/db/models/Word";
import type Translation from "@/db/models/WordTranslation";
import { logger } from "@/utils/logger";
import type { TrainingSession, SessionStatus } from "../model/session";
import { trainingService, type TrainingConditions } from "./trainingService";
export type WordsPool = {
	currentPairs: WordPair[];
	currentRandomWords: Word[];
	currentRandomTranslations: Translation[];
};
type State = {
	epoch: number;
	ready: boolean;
	currentTrainingId: string | null;
	status: SessionStatus;
	error: unknown;
	session: TrainingSession | null;
	allPairs: WordPair[];
	wordsPool: WordsPool;
	sessionStats: {
		successCount: number;
		failureCount: number;
		totalCount: number;
		successEventCount: number;
	};
};
const emptyWords = (): WordsPool => ({
	currentPairs: [],
	currentRandomWords: [],
	currentRandomTranslations: [],
});
/** One observable owner of the word snapshot, session, async delivery and errors.
 * React and route/selection stores are deliberately absent from this controller. */
export function createTrainingController(
	conditions: TrainingConditions,
	isCurrent: () => boolean = () => true,
) {
	const store = createStore<State>(() => ({
		epoch: 0,
		ready: false,
		currentTrainingId: null,
		status: "loading",
		error: null,
		session: null,
		allPairs: [],
		wordsPool: emptyWords(),
		sessionStats: {
			successCount: 0,
			failureCount: 0,
			totalCount: 0,
			successEventCount: 0,
		},
	}));
	let running = true,
		epoch = 0;
	let initialization: Promise<void> = Promise.resolve();
	let loading: Promise<void> | null = null;
	let unsubscribe: (() => void) | undefined;
	let pending = new Map<string, Promise<unknown>>();
	let failures = new Set<number>(),
		pendingFailures = new Set<number>();
	let successEvents = 0;
	const active = (version = epoch) =>
		running && version === epoch && isCurrent();
	const publish = () => {
		const state = store.getState();
		const id = state.currentTrainingId as ExerciseId | null;
		store.setState({
			status: state.error ? "error" : (state.session?.status ?? "loading"),
			sessionStats: {
				successCount: Math.max(
					0,
					(id ? (state.session?.mastered(id) ?? 0) : 0) - pendingFailures.size,
				),
				failureCount: failures.size,
				totalCount: state.allPairs.length,
				successEventCount: successEvents,
			},
		});
	};
	const fail = (error: unknown, version: number) => {
		if (active(version)) {
			store.setState({ error, status: "error" });
			logger.error("Training operation failed", error, "db");
		}
	};
	const hydrate = () => {
		running = true;
		const version = ++epoch;
		unsubscribe?.();
		pending = new Map();
		loading = null;
		failures = new Set();
		pendingFailures = new Set();
		successEvents = 0;
		store.setState({
			epoch,
			ready: false,
			status: "loading",
			error: null,
			session: null,
			allPairs: [],
			wordsPool: emptyWords(),
		});
		publish();
		initialization = trainingService
			.prepare(conditions)
			.then((prepared) => {
				if (!active(version)) return;
				const id = store.getState().currentTrainingId;
				if (conditions.mode === "single" && id)
					prepared.session.configureTrainings([id as ExerciseId]);
				store.setState({
					session: prepared.session,
					allPairs: prepared.pairs,
					ready: true,
				});
				unsubscribe = prepared.session.subscribe(publish);
				publish();
			})
			.catch((error) => {
				fail(error, version);
				if (active(version)) store.setState({ ready: true });
			});
		return initialization;
	};
	const wait = () => Promise.all([...pending.values()]);
	const loadData = (
		count = 1,
		wordCount = 0,
		translationCount = 1,
	): Promise<void> => {
		if (loading) return loading;
		const version = epoch;
		const request = (async () => {
			await initialization;
			await wait();
			if (!active(version)) return;
			const { session, currentTrainingId, allPairs } = store.getState();
			if (!session || !currentTrainingId) return;
			const step = session.select(currentTrainingId as ExerciseId, count);
			const pairs = step.wordIds.flatMap((id) =>
				allPairs.filter((pair) => pair.word.remoteId === id),
			);
			const extras = await trainingService.distractors(
				conditions,
				pairs,
				wordCount,
				translationCount,
			);
			if (
				!active(version) ||
				store.getState().session !== session ||
				session.currentStep?.id !== step.id ||
				store.getState().currentTrainingId !== step.training
			)
				return;
			store.setState({
				wordsPool: {
					currentPairs: pairs,
					currentRandomWords: extras.words,
					currentRandomTranslations: extras.translations,
				},
			});
		})()
			.catch((error) => fail(error, version))
			.finally(() => {
				if (loading === request) loading = null;
			});
		loading = request;
		return request;
	};
	const setCurrentTrainingId = (id: string | null) => {
		if (store.getState().currentTrainingId === id) return;
		loading = null;
		failures.clear();
		pendingFailures.clear();
		successEvents = 0;
		store.setState({ currentTrainingId: id, wordsPool: emptyWords() });
		if (id && conditions.mode === "single")
			store.getState().session?.configureTrainings([id as ExerciseId]);
		publish();
	};
	// The displayed step and epoch are captured by the React integration when it
	// exposes an event handler. A delayed handler cannot target a newer same-word task.
	const record = (
		version: number,
		step: TrainingSession["currentStep"],
		wordId: number,
		scoreDelta: number,
		result: "success" | "failure",
	) => {
		const { session, allPairs } = store.getState();
		const pair = allPairs.find((item) => item.word.remoteId === wordId);
		if (
			!active(version) ||
			!session ||
			!step ||
			!pair ||
			!session.canApply(step.id, wordId) ||
			store.getState().currentTrainingId !== step.training
		)
			return Promise.resolve(false);
		const event = `${version}:${step.id}:${wordId}`;
		const existing = pending.get(event);
		if (existing) return existing;
		if (result === "failure") {
			failures.add(wordId);
			if (session.hasMastered(wordId, step.training))
				pendingFailures.add(wordId);
			publish();
		}
		const request = (
			conditions.userId
				? progressService.record({
						userId: conditions.userId,
						wordId,
						scoreDelta,
						result,
						translationId: pair.translation.remoteId,
						trainingId: step.training,
					})
				: Promise.resolve()
		)
			.then(() => {
				if (!active(version) || store.getState().session !== session)
					return false;
				pendingFailures.delete(wordId);
				const applied = session.apply(step.id, wordId, result === "success");
				if (applied && result === "success") {
					successEvents++;
					failures.delete(wordId);
				}
				publish();
				return applied;
			})
			.catch((error) => {
				fail(error, version);
				throw error;
			});
		pending.set(event, request);
		void request.catch(() => {});
		return request;
	};
	const getIncompleteTrainingIds = async (ids: LearningTrainingName[]) => {
		const version = epoch;
		await initialization;
		await wait();
		if (!active(version)) return [];
		const session = store.getState().session;
		if (!session)
			throw (
				store.getState().error ?? new Error("Training initialization failed")
			);
		if (conditions.mode === "mixed") session.configureTrainings(ids);
		if (conditions.userId) {
			const progress = await progressService.readWords(conditions.userId, [
				...session.wordIds,
			]);
			if (!active(version)) return [];
			session.refresh(progress);
		}
		return session.remaining(ids) as LearningTrainingName[];
	};
	const startReview = () => {
		const { session, currentTrainingId } = store.getState();
		if (!session || !currentTrainingId) return;
		session.startReview(currentTrainingId as ExerciseId);
		pending.clear();
		failures.clear();
		pendingFailures.clear();
		successEvents = 0;
		publish();
		void loadData();
	};
	return {
		store,
		hydrate,
		loadData,
		record,
		setCurrentTrainingId,
		getIncompleteTrainingIds,
		startReview,
		dispose: () => {
			running = false;
			epoch++;
			unsubscribe?.();
		},
		retry: hydrate,
	};
}
