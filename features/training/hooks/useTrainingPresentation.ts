import { readTopicCompletion } from "../services/topicCompletion";
import { useOperationScope } from "@/shared/lifecycle/useOperationScope";
import {
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";
import { BackgroundContext } from "@/context/BackgroundContext";
import { ExerciseContext } from "@/features/training/components/ExerciseProvider";
import { useAudioReadiness } from "@/shared/audio/useAudioReadiness";
import { useSelectionStore } from "@/shared/selection/selectionStore";
import { useSessionUser } from "@/shared/session/useSession";
import { Colors } from "@/mob-ui/brand/colors";
import { learningRepository } from "@/db/repositories/learning.repository";
import { logger } from "@/utils/logger";
import { shuffleArray } from "@/utils";
import EXERCISES_APPS from "@/shared/training/presentation";
import type { LearningTrainingName } from "@/shared/progress/exercises";

export function useTrainingPresentation(
	exercise: LearningTrainingName | undefined,
	excludedExercises: LearningTrainingName[],
) {
	const { t } = useTranslation();

	const [currentExercise, setCurrentExercise] =
		useState<LearningTrainingName | null>(null);
	const [currentTitle, setCurrentTitle] = useState<string>("");
	const [isSelectingExercise, setIsSelectingExercise] = useState(false);
	const [mixComplete, setMixComplete] = useState(false);
	const [selectionError, setSelectionError] = useState(false);
	const selectionRequestId = useRef(0);
	const [progressFlashTrigger, setProgressFlashTrigger] = useState(0);
	const [showMasteredPrompt, setShowMasteredPrompt] = useState(false);
	const [showNextTopicPrompt, setShowNextTopicPrompt] = useState(false);
	const [nextTopicTitle, setNextTopicTitle] = useState<string | null>(null);
	const [nextTopicId, setNextTopicId] = useState<number | null>(null);
	const [isCurrentTopicComplete, setIsCurrentTopicComplete] = useState(false);
	const masteredPromptTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
		null,
	);
	const nextTopicPromptTimeoutRef = useRef<ReturnType<
		typeof setTimeout
	> | null>(null);
	const previousMasteredRef = useRef<boolean | null>(null);
	const previousTopicCompleteRef = useRef<boolean | null>(null);
	const hasShownInitialTopicPromptRef = useRef(false);
	const {
		addCompleteListener,
		removeCompleteListener,
		setCurrentTrainingId,
		currentTrainingId,
		startReview,
		status: trainingStatus,
		retry: retryTraining,
		queueReady,
		getIncompleteTrainingIds,
		sessionStats: { successCount, totalCount, successEventCount },
	} = useContext(ExerciseContext);
	useEffect(() => {
		if (exercise && queueReady && trainingStatus === "completed")
			setShowMasteredPrompt(true);
	}, [exercise, queueReady, trainingStatus]);
	const isExerciseReady = queueReady && currentTrainingId === currentExercise;
	const { setColor, setOpacity } = useContext(BackgroundContext);
	const { user } = useSessionUser();
	const { currentPairs } = useContext(ExerciseContext).wordsPool;
	const { currentCatalogs, currentTopics, setCurrentTopics } =
		useSelectionStore();
	const { isAudioReady, isAudioReadinessLoading } = useAudioReadiness();
	const begin = useOperationScope(
		JSON.stringify([
			user?.userId,
			user?.language_learn,
			user?.language_speak,
			currentCatalogs,
			currentTopics,
			currentExercise,
		]),
	);
	const selectedTopicId = currentTopics.length === 1 ? currentTopics[0] : null;
	const isListeningAudioUnavailable =
		exercise === "listening_practice" &&
		!isAudioReadinessLoading &&
		!isAudioReady;

	const effectiveExcludedExercises = useMemo(() => {
		if (
			(!isAudioReadinessLoading && isAudioReady) ||
			excludedExercises.includes("listening_practice")
		) {
			return excludedExercises;
		}

		return [...excludedExercises, "listening_practice"];
	}, [excludedExercises, isAudioReady, isAudioReadinessLoading]);

	const orderedTrainingIds = useMemo(
		() =>
			(Object.keys(EXERCISES_APPS) as LearningTrainingName[]).filter(
				(trainingId) => !effectiveExcludedExercises.includes(trainingId),
			),
		[effectiveExcludedExercises],
	);
	const nextTrainingId = useMemo(() => {
		if (!currentExercise) {
			return null;
		}

		const currentIndex = orderedTrainingIds.indexOf(currentExercise);

		if (currentIndex === -1) {
			return null;
		}

		return (
			orderedTrainingIds[(currentIndex + 1) % orderedTrainingIds.length] ?? null
		);
	}, [currentExercise, orderedTrainingIds]);

	useEffect(() => {
		if (!currentExercise) return;
		setCurrentTrainingId(currentExercise);
	}, [currentExercise, setCurrentTrainingId]);

	useEffect(
		() => () => {
			setCurrentTrainingId(null);
		},
		[setCurrentTrainingId],
	);

	const setRandomExercise = useCallback(async () => {
		const requestId = ++selectionRequestId.current;
		setIsSelectingExercise(true);
		setSelectionError(false);
		try {
			const incompleteIds = await getIncompleteTrainingIds(orderedTrainingIds);
			if (requestId !== selectionRequestId.current) return;
			const nextId = shuffleArray(incompleteIds)[0];
			setMixComplete(!nextId);
			if (nextId) setCurrentExercise(nextId);
		} catch (error) {
			if (requestId !== selectionRequestId.current) return;
			logger.error("Failed to select next mix exercise", error, "db");
			setSelectionError(true);
		} finally {
			if (requestId === selectionRequestId.current)
				setIsSelectingExercise(false);
		}
	}, [getIncompleteTrainingIds, orderedTrainingIds]);

	useEffect(
		() => () => {
			selectionRequestId.current += 1;
		},
		[],
	);

	const onExerciseComplete = useCallback(() => {
		if (!exercise) {
			void setRandomExercise();
		}
	}, [setRandomExercise, exercise]);

	useEffect(() => {
		if (!exercise && !currentExercise && queueReady) {
			void setRandomExercise();
		}
	}, [currentExercise, exercise, queueReady, setRandomExercise]);

	useEffect(() => {
		addCompleteListener(onExerciseComplete);
		return () => {
			removeCompleteListener(onExerciseComplete);
		};
	}, [addCompleteListener, removeCompleteListener, onExerciseComplete]);

	useEffect(() => {
		if (exercise) {
			setCurrentExercise(exercise);
		}
	}, [exercise]);

	useEffect(() => {
		if (!currentExercise) {
			return;
		}

		setShowMasteredPrompt(false);
		setShowNextTopicPrompt(false);
		setNextTopicTitle(null);
		setNextTopicId(null);
		setIsCurrentTopicComplete(false);
		previousMasteredRef.current = null;
		previousTopicCompleteRef.current = null;
		hasShownInitialTopicPromptRef.current = false;

		if (masteredPromptTimeoutRef.current) {
			clearTimeout(masteredPromptTimeoutRef.current);
			masteredPromptTimeoutRef.current = null;
		}

		if (nextTopicPromptTimeoutRef.current) {
			clearTimeout(nextTopicPromptTimeoutRef.current);
			nextTopicPromptTimeoutRef.current = null;
		}
	}, [currentExercise]);

	useEffect(() => {
		if (!currentExercise) return;
		const exercise = EXERCISES_APPS[currentExercise];

		setColor(exercise?.backgroundColor ?? Colors.backgrounds.green);
		setOpacity(1);
		setCurrentTitle(t(exercise?.titleId ?? ""));

		return () => {
			setColor(Colors.backgrounds.green);
			setOpacity(0.3);
		};
	}, [currentExercise, setColor, setOpacity, t]);

	const checkTopicCompletion = useCallback(
		async () =>
			readTopicCompletion(
				user?.userId,
				user?.language_learn,
				currentCatalogs,
				currentTopics,
				selectedTopicId,
			),
		[
			currentCatalogs,
			currentTopics,
			selectedTopicId,
			user?.language_learn,
			user?.userId,
		],
	);

	useEffect(() => {
		let isMounted = true;
		let unsubscribe: (() => void) | undefined;

		if (
			!user?.userId ||
			!user.language_learn ||
			currentCatalogs.length === 0 ||
			selectedTopicId == null
		) {
			setIsCurrentTopicComplete(false);
			setNextTopicId(null);
			setNextTopicTitle(null);
			return;
		}

		const current = begin();
		const syncProgress = async () => {
			const result = await checkTopicCompletion();

			if (!isMounted || !current()) {
				return;
			}

			setIsCurrentTopicComplete(result.isComplete);
			setNextTopicId(result.nextTopicId);
			setNextTopicTitle(result.nextTopicTitle);
		};

		syncProgress().catch(() => {
			if (!isMounted || !current()) {
				return;
			}

			setIsCurrentTopicComplete(false);
			setNextTopicId(null);
			setNextTopicTitle(null);
		});

		const subscription = learningRepository
			.observeByUser(user.userId)
			.subscribe(() => {
				syncProgress().catch(() => {
					if (!isMounted || !current()) {
						return;
					}

					setIsCurrentTopicComplete(false);
					setNextTopicId(null);
					setNextTopicTitle(null);
				});
			});
		unsubscribe = () => subscription.unsubscribe();

		return () => {
			isMounted = false;
			unsubscribe?.();
		};
	}, [
		checkTopicCompletion,
		begin,
		currentCatalogs,
		selectedTopicId,
		user?.language_learn,
		user?.userId,
	]);

	useEffect(() => {
		if (!exercise) {
			return;
		}

		const isMastered = totalCount > 0 && successCount >= totalCount;

		if (previousMasteredRef.current === null) {
			previousMasteredRef.current = isMastered;
			return;
		}

		if (
			!previousMasteredRef.current &&
			isMastered &&
			successEventCount > 0 &&
			!isCurrentTopicComplete
		) {
			setProgressFlashTrigger((value) => value + 1);

			if (masteredPromptTimeoutRef.current) {
				clearTimeout(masteredPromptTimeoutRef.current);
			}

			masteredPromptTimeoutRef.current = setTimeout(() => {
				void (async () => {
					const current = begin();
					const shouldCheckTopic =
						selectedTopicId != null &&
						user?.userId != null &&
						user.language_learn &&
						currentCatalogs.length > 0;

					if (!shouldCheckTopic) {
						setShowMasteredPrompt(true);
						return;
					}

					try {
						const result = await checkTopicCompletion();
						if (!current()) return;
						setIsCurrentTopicComplete(result.isComplete);
						setNextTopicId(result.nextTopicId);
						setNextTopicTitle(result.nextTopicTitle);

						if (result.isComplete && result.nextTopicId != null) {
							setShowMasteredPrompt(false);
							setShowNextTopicPrompt(true);
							return;
						}
					} catch {
						// Fall back to the training prompt when the topic refresh fails.
					}

					setShowMasteredPrompt(true);
				})();
			}, 900);
		}

		previousMasteredRef.current = isMastered;
	}, [
		checkTopicCompletion,
		begin,
		currentCatalogs.length,
		exercise,
		isCurrentTopicComplete,
		selectedTopicId,
		successCount,
		successEventCount,
		totalCount,
		user?.language_learn,
		user?.userId,
	]);

	useEffect(() => {
		if (selectedTopicId == null) {
			setShowNextTopicPrompt(false);
			previousTopicCompleteRef.current = null;
			return;
		}

		if (previousTopicCompleteRef.current === null) {
			previousTopicCompleteRef.current = isCurrentTopicComplete;
			return;
		}

		if (
			!previousTopicCompleteRef.current &&
			isCurrentTopicComplete &&
			successEventCount > 0 &&
			nextTopicId != null &&
			!showNextTopicPrompt
		) {
			setShowMasteredPrompt(false);

			if (masteredPromptTimeoutRef.current) {
				clearTimeout(masteredPromptTimeoutRef.current);
				masteredPromptTimeoutRef.current = null;
			}

			if (nextTopicPromptTimeoutRef.current) {
				clearTimeout(nextTopicPromptTimeoutRef.current);
			}

			nextTopicPromptTimeoutRef.current = setTimeout(() => {
				setShowNextTopicPrompt(true);
			}, 700);
		}

		previousTopicCompleteRef.current = isCurrentTopicComplete;
	}, [
		isCurrentTopicComplete,
		nextTopicId,
		selectedTopicId,
		showNextTopicPrompt,
		successEventCount,
	]);

	useEffect(() => {
		if (
			!exercise ||
			selectedTopicId == null ||
			successEventCount > 0 ||
			!isCurrentTopicComplete ||
			nextTopicId == null ||
			hasShownInitialTopicPromptRef.current
		) {
			return;
		}

		hasShownInitialTopicPromptRef.current = true;
		setShowMasteredPrompt(false);
		setShowNextTopicPrompt(true);
	}, [
		exercise,
		isCurrentTopicComplete,
		nextTopicId,
		selectedTopicId,
		successEventCount,
	]);

	useEffect(() => {
		return () => {
			if (masteredPromptTimeoutRef.current) {
				clearTimeout(masteredPromptTimeoutRef.current);
			}

			if (nextTopicPromptTimeoutRef.current) {
				clearTimeout(nextTopicPromptTimeoutRef.current);
			}
		};
	}, []);

	const handleContinueCurrentTraining = useCallback(() => {
		setShowMasteredPrompt(false);
		startReview?.();
	}, [startReview]);

	const handleStayOnCurrentTopic = useCallback(() => {
		hasShownInitialTopicPromptRef.current = true;
		setShowNextTopicPrompt(false);
		startReview?.();
	}, [startReview]);

	const handleOpenNextTraining = useCallback(() => {
		if (!nextTrainingId) {
			return;
		}

		setShowMasteredPrompt(false);
		router.replace({
			pathname: `/authorized/learning/${nextTrainingId}`,
		});
	}, [nextTrainingId]);

	const handleOpenNextTopic = useCallback(() => {
		if (nextTopicId == null) {
			return;
		}

		setShowNextTopicPrompt(false);
		setCurrentTopics([nextTopicId]);
		setCurrentExercise(orderedTrainingIds[0] ?? null);
	}, [nextTopicId, orderedTrainingIds, setCurrentTopics]);

	return {
		trainingStatus,
		retryTraining,
		t,
		currentExercise,
		currentTitle,
		isSelectingExercise,
		mixComplete,
		selectionError,
		progressFlashTrigger,
		showMasteredPrompt,
		showNextTopicPrompt,
		nextTopicTitle,
		nextTopicId,
		isExerciseReady,
		isListeningAudioUnavailable,
		totalCount,
		currentPairs,
		setRandomExercise,
		handleStayOnCurrentTopic,
		handleOpenNextTopic,
		handleContinueCurrentTraining,
		handleOpenNextTraining,
	};
}
