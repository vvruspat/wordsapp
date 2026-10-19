import { useCallback, useEffect, useRef, useState } from "react";
import type {
	ExerciseId,
	LearningTrainingName,
} from "@/shared/progress/exercises";
import { progressService } from "@/shared/progress/progressService";
import { useExcerciseStore } from "@/hooks/useExcerciseStore";
import { useSessionUser } from "@/hooks/useSession";
import { logger } from "@/utils/logger";
import {
	trainingService,
	type TrainingConditions,
} from "../services/trainingService";
import type { SessionStatus } from "../model/session";

type Prepared = Awaited<ReturnType<typeof trainingService.prepare>>;
export function useTrainingManager(mode: "mixed" | "single") {
	const { user } = useSessionUser();
	const catalogs = useExcerciseStore((state) => state.currentCatalogs);
	const topics = useExcerciseStore((state) => state.currentTopics);
	const wordIds = useExcerciseStore((state) => state.chunkWordIds);
	const conditions: TrainingConditions = {
		userId: user?.userId,
		learningLanguage: user?.language_learn ?? "en",
		nativeLanguage: user?.language_speak ?? "en",
		catalogs,
		topics,
		wordIds,
		mode,
	};
	const key = JSON.stringify([
		conditions.userId,
		conditions.learningLanguage,
		conditions.nativeLanguage,
		catalogs,
		topics,
		mode,
		mode === "mixed" ? wordIds : null,
	]);
	const scope = useRef({ key, generation: 0 });
	if (scope.current.key !== key)
		scope.current = { key, generation: scope.current.generation + 1 };
	const generation = scope.current.generation;
	const [currentTrainingId, setCurrentTrainingIdState] = useState<
		string | null
	>(null);
	const [status, setStatus] = useState<SessionStatus>("loading");
	const [error, setError] = useState<unknown>(null);
	const [readyKey, setReadyKey] = useState<string | null>(null);
	const [, publish] = useState(0);
	const prepared = useRef<Prepared | null>(null);
	const initialization = useRef<Promise<void> | null>(null);
	const pending = useRef(new Map<string, Promise<unknown>>());
	const inFlightLoad = useRef<Promise<void> | null>(null);
	const stats = useRef({
		successCount: 0,
		failureCount: 0,
		totalCount: 0,
		successEventCount: 0,
	});
	const failures = useRef(new Set<number>());
	const mounted = useRef(true);
	const hydrationRequest = useRef(0);
	const active = useCallback(
		() => mounted.current && scope.current.generation === generation,
		[generation],
	);
	const hydrate = useCallback(() => {
		const requestId = ++hydrationRequest.current;
		const [
			userId,
			learningLanguage,
			nativeLanguage,
			catalogs,
			topics,
			mode,
			wordIds,
		] = JSON.parse(key) as [
			number | undefined,
			string,
			string,
			number[],
			number[],
			"mixed" | "single",
			number[] | null,
		];
		const snapshot: TrainingConditions = {
			userId,
			learningLanguage,
			nativeLanguage,
			catalogs,
			topics,
			mode,
			wordIds,
		};
		setStatus("loading");
		setError(null);
		setReadyKey(null);
		prepared.current = null;
		pending.current = new Map();
		inFlightLoad.current = null;
		stats.current = {
			successCount: 0,
			failureCount: 0,
			totalCount: 0,
			successEventCount: 0,
		};
		failures.current = new Set();
		useExcerciseStore.getState().setExerciseData([], [], []);
		const promise = trainingService
			.prepare(snapshot)
			.then((value) => {
				if (!active() || hydrationRequest.current !== requestId) return;
				prepared.current = value;
				setStatus(value.session.status);
				setReadyKey(key);
				stats.current = { ...stats.current, totalCount: value.pairs.length };
				publish((n) => n + 1);
			})
			.catch((reason) => {
				if (active() && hydrationRequest.current === requestId) {
					setError(reason);
					setStatus("error");
					setReadyKey(key);
				}
			});
		initialization.current = promise;
		return promise;
		// key is the complete immutable selection snapshot.
	}, [key, active]);
	useEffect(() => {
		mounted.current = true;
		void hydrate();
		return () => {
			mounted.current = false;
			hydrationRequest.current++;
		};
	}, [hydrate]);
	const setCurrentTrainingId = useCallback(
		(id: string | null) => {
			setCurrentTrainingIdState(id);
			inFlightLoad.current = null;
			const session = prepared.current?.session;
			if (session && mode === "single" && id)
				session.configureTrainings([id as ExerciseId]);
			stats.current = {
				...stats.current,
				successCount: session && id ? session.mastered(id as ExerciseId) : 0,
				successEventCount: 0,
				failureCount: 0,
			};
			failures.current = new Set();
		},
		[mode],
	);
	useEffect(() => {
		const session = prepared.current?.session;
		if (readyKey && session && currentTrainingId) {
			if (mode === "single")
				session.configureTrainings([currentTrainingId as ExerciseId]);
			stats.current.successCount = session.mastered(
				currentTrainingId as ExerciseId,
			);
			publish((n) => n + 1);
		}
	}, [currentTrainingId, readyKey, mode]);
	const waitForResults = useCallback(async () => {
		await Promise.all([...pending.current.values()]);
	}, []);
	const loadData = useCallback(
		(count = 1, wordCount = 0, translationCount = 1): Promise<void> => {
			if (inFlightLoad.current) return inFlightLoad.current;
			const request = (async () => {
				await initialization.current;
				await waitForResults();
				if (!active() || !currentTrainingId || !prepared.current) return;
				const state = prepared.current;
				const step = state.session.select(
					currentTrainingId as ExerciseId,
					count,
				);
				const pairs = step.wordIds.flatMap((id) =>
					state.pairs.filter((pair) => pair.word.remoteId === id),
				);
				const extras = await trainingService.distractors(
					conditionsFromKey(key),
					pairs,
					wordCount,
					translationCount,
				);
				if (
					!active() ||
					prepared.current !== state ||
					state.session.currentStep?.id !== step.id
				)
					return;
				useExcerciseStore
					.getState()
					.setExerciseData(pairs, extras.words, extras.translations);
				publish((n) => n + 1);
			})()
				.catch((reason) => {
					if (active()) {
						setError(reason);
						setStatus("error");
					}
					logger.error("Unable to prepare exercise", reason, "db");
				})
				.finally(() => {
					if (inFlightLoad.current === request) inFlightLoad.current = null;
				});
			inFlightLoad.current = request;
			return request;
		},
		[active, currentTrainingId, waitForResults, key],
	);
	const displayedState = prepared.current;
	const displayedStep = displayedState?.session.currentStep;
	const record = useCallback(
		(wordId: number, scoreDelta: number, result: "success" | "failure") => {
			const state = displayedState;
			const step = displayedStep;
			const pair = state?.pairs.find((item) => item.word.remoteId === wordId);
			if (
				!active() ||
				prepared.current !== state ||
				!state ||
				!step ||
				!pair ||
				!state.session.canApply(step.id, wordId)
			)
				return Promise.resolve(false);
			const event = `${generation}:${step.id}:${wordId}`;
			const existing = pending.current.get(event);
			if (existing) return existing;
			// Failure feedback is immediate; durable completion/next step still waits.
			if (result === "failure") {
				stats.current.successCount = Math.max(
					0,
					stats.current.successCount - 1,
				);
				failures.current.add(wordId);
				stats.current.failureCount = failures.current.size;
				publish((n) => n + 1);
			}
			const saving = (
				user?.userId
					? progressService.record({
							userId: user.userId,
							wordId,
							scoreDelta,
							result,
							translationId: pair.translation.remoteId,
							trainingId: step.training,
						})
					: Promise.resolve()
			)
				.then(() => {
					if (!active() || prepared.current !== state) return false;
					const applied = state.session.apply(
						step.id,
						wordId,
						result === "success",
					);
					if (applied) {
						stats.current.successCount = state.session.mastered(step.training);
						if (result === "success") {
							stats.current.successEventCount++;
							failures.current.delete(wordId);
						}
						stats.current.failureCount = failures.current.size;
						setStatus(state.session.status);
						publish((n) => n + 1);
					}
					return applied;
				})
				.catch((reason) => {
					if (active()) {
						setError(reason);
						setStatus("error");
					}
					throw reason;
				});
			pending.current.set(event, saving);
			// Keep rejection observable to waitForResults without an unhandled event promise.
			void saving.catch((reason) =>
				logger.error("Failed to record exercise result", reason, "db"),
			);
			return saving;
		},
		[active, generation, user?.userId, displayedState, displayedStep],
	);
	const getIncompleteTrainingIds = useCallback(
		async (ids: LearningTrainingName[]) => {
			await initialization.current;
			await waitForResults();
			if (!active()) return [];
			const state = prepared.current;
			if (!state) throw error ?? new Error("Training initialization failed");
			if (mode === "mixed") state.session.configureTrainings(ids);
			if (user?.userId)
				state.session.refresh(
					await progressService.readWords(user.userId, [
						...state.session.wordIds,
					]),
				);
			if (!active()) return [];
			return state.session.remaining(ids) as LearningTrainingName[];
		},
		[active, user?.userId, waitForResults, error, mode],
	);
	const startReview = useCallback(() => {
		if (!currentTrainingId || !prepared.current) return;
		prepared.current.session.startReview(currentTrainingId as ExerciseId);
		stats.current = {
			successCount: 0,
			failureCount: 0,
			totalCount: prepared.current.pairs.length,
			successEventCount: 0,
		};
		pending.current.clear();
		setStatus("ready");
		publish((n) => n + 1);
		void loadData();
	}, [currentTrainingId, loadData]);
	return {
		currentTrainingId,
		setCurrentTrainingId,
		queueReady: readyKey === key,
		loadData,
		record,
		getIncompleteTrainingIds,
		sessionStats: stats.current,
		status,
		error,
		retry: hydrate,
		startReview,
	};
}

function conditionsFromKey(key: string): TrainingConditions {
	const [
		userId,
		learningLanguage,
		nativeLanguage,
		catalogs,
		topics,
		mode,
		wordIds,
	] = JSON.parse(key) as [
		number | undefined,
		string,
		string,
		number[],
		number[],
		"mixed" | "single",
		number[] | null,
	];
	return {
		userId,
		learningLanguage,
		nativeLanguage,
		catalogs,
		topics,
		mode,
		wordIds,
	};
}
