import { BackgroundContext } from "@/context/BackgroundContext";
import { ExerciseContext } from "@/context/ExerciseContext";
import { learningRepository } from "@/db/repositories/learning.repository";
import { topicsRepository } from "@/db/repositories/topics.repository";
import { wordsRepository } from "@/db/repositories/words.repository";
import { styles } from "@/general.styles";
import { useAudioReadiness } from "@/hooks/useAudioReadiness";
import { useExcerciseStore } from "@/hooks/useExcerciseStore";
import { useSessionUser } from "@/hooks/useSession";
import { WButton, WCard, WText } from "@/mob-ui";
import { Colors } from "@/mob-ui/brand/colors";
import { buildTopicProgressStats } from "@/utils/topicProgress";
import { shuffleArray } from "@/utils";
import AntDesign from "@expo/vector-icons/AntDesign";
import { Link, router } from "expo-router";
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { KeyboardAvoidingView, Platform, View } from "react-native";
import {
	SafeAreaView,
	SafeAreaViewProps,
} from "react-native-safe-area-context";
import { LearningTrainingName } from "../LearningCatalog";
import EXERCISES_APPS from "../LearningCatalog/types";
import {
	CardsExercise,
	ChooseTranslationExercise,
	ListeningPracticeExercise,
	MatchWordsExercise,
	TrueOrFalseExercise,
	TypeWordExercise,
} from "../TrainingExercises";
import { TrainingProgressBar } from "../TrainingProgressBar";
import { trainingAppWrapperStyles } from "./TrainingAppWrapper.styles";

type TrainingAppWrapperProps = SafeAreaViewProps & {
	title?: string;
	exercise?: LearningTrainingName;
	excludedExercises?: LearningTrainingName[];
};

export const TrainingAppWrapper = ({
	title = "",
	exercise,
	excludedExercises = [],
	children,
	style,
	...restViewProps
}: TrainingAppWrapperProps) => {
	const { t } = useTranslation();

	const [currentExercise, setCurrentExercise] =
		useState<LearningTrainingName | null>(null);
	const [currentTitle, setCurrentTitle] = useState<string>("");
	const [progressFlashTrigger, setProgressFlashTrigger] = useState(0);
	const [showMasteredPrompt, setShowMasteredPrompt] = useState(false);
	const [showNextTopicPrompt, setShowNextTopicPrompt] = useState(false);
	const [nextTopicTitle, setNextTopicTitle] = useState<string | null>(null);
	const [nextTopicId, setNextTopicId] = useState<number | null>(null);
	const [isCurrentTopicComplete, setIsCurrentTopicComplete] = useState(false);
	const masteredPromptTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
		null,
	);
	const nextTopicPromptTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
		null,
	);
	const previousMasteredRef = useRef<boolean | null>(null);
	const previousTopicCompleteRef = useRef<boolean | null>(null);
	const hasShownInitialTopicPromptRef = useRef(false);
	const {
		addCompleteListener,
		removeCompleteListener,
		setCurrentTrainingId,
		sessionStats: { successCount, totalCount, successEventCount },
	} = useContext(ExerciseContext);
	const { setColor, setOpacity } = useContext(BackgroundContext);
	const { user } = useSessionUser();
	const { currentCatalogs, currentTopics, setCurrentTopics } = useExcerciseStore();
	const { isAudioReady } = useAudioReadiness();
	const selectedTopicId = currentTopics.length === 1 ? currentTopics[0] : null;

	const effectiveExcludedExercises = useMemo(() => {
		if (
			isAudioReady ||
			excludedExercises.includes("listening_practice")
		) {
			return excludedExercises;
		}

		return [...excludedExercises, "listening_practice"];
	}, [excludedExercises, isAudioReady]);

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

		return orderedTrainingIds[(currentIndex + 1) % orderedTrainingIds.length] ?? null;
	}, [currentExercise, orderedTrainingIds]);

	useEffect(() => {
		if (!currentExercise) return;
		setCurrentTrainingId(currentExercise);

		return () => {
			setCurrentTrainingId(null);
		};
	}, [currentExercise, setCurrentTrainingId]);

	const setRandomExercise = useCallback(() => {
		const availableTrainings = Object.values(EXERCISES_APPS).filter(
			(training) => !effectiveExcludedExercises.includes(training.id),
		);
		const randomTraining = shuffleArray(availableTrainings)[0];

		if (!randomTraining) {
			return;
		}

		setCurrentExercise(randomTraining.id);
		setCurrentTitle(t(randomTraining.titleId));
		setColor(randomTraining.backgroundColor);
		setOpacity(1);
	}, [effectiveExcludedExercises, t, setColor, setOpacity]);

	const onExerciseComplete = useCallback(() => {
		if (!exercise) {
			setRandomExercise();
		}
	}, [setRandomExercise, exercise]);

	useEffect(() => {
		onExerciseComplete();
	}, [onExerciseComplete]);

	useEffect(() => {
		addCompleteListener(onExerciseComplete);
		return () => {
			removeCompleteListener(onExerciseComplete);
		};
	}, [addCompleteListener, removeCompleteListener, onExerciseComplete]);

	useEffect(() => {
		if (exercise) {
			if (exercise === "listening_practice" && !isAudioReady) {
				router.replace("/authorized/learning");
				return;
			}

			setCurrentExercise(exercise);
		}
	}, [exercise, isAudioReady]);

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

	const checkTopicCompletion = useCallback(async () => {
		if (
			!user?.userId ||
			!user.language_learn ||
			currentCatalogs.length === 0 ||
			selectedTopicId == null
		) {
			return {
				isComplete: false,
				nextTopicId: null,
				nextTopicTitle: null,
			};
		}

		const [topics, words, progressRecords, availableTopicIds] = await Promise.all([
			topicsRepository.getByLanguage(user.language_learn),
			wordsRepository.getByTopicIds(currentTopics, currentCatalogs),
			learningRepository.getByUser(user.userId),
			wordsRepository.getTopicsByCatalogs(currentCatalogs),
		]);

		const sortedTopics = topics.sort((a, b) => a.title.localeCompare(b.title));
		const filteredTopics = sortedTopics.filter((topic) =>
			availableTopicIds.has(topic.remoteId),
		);
		const currentTopicIndex = filteredTopics.findIndex(
			(topic) => topic.remoteId === selectedTopicId,
		);
		const nextTopic = currentTopicIndex >= 0 ? filteredTopics[currentTopicIndex + 1] : null;
		const stats = buildTopicProgressStats(words, progressRecords);
		const topicStats = stats.get(selectedTopicId);

		return {
			isComplete: Boolean(
				topicStats && topicStats.total > 0 && topicStats.learned >= topicStats.total,
			),
			nextTopicId: nextTopic?.remoteId ?? null,
			nextTopicTitle: nextTopic?.title ?? null,
		};
	}, [
		currentCatalogs,
		currentTopics,
		selectedTopicId,
		user?.language_learn,
		user?.userId,
	]);

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

		const syncProgress = async () => {
			const result = await checkTopicCompletion();

			if (!isMounted) {
				return;
			}

			setIsCurrentTopicComplete(result.isComplete);
			setNextTopicId(result.nextTopicId);
			setNextTopicTitle(result.nextTopicTitle);
		};

		syncProgress().catch(() => {
			if (!isMounted) {
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
					if (!isMounted) {
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
	}, [isCurrentTopicComplete, nextTopicId, selectedTopicId, showNextTopicPrompt, successEventCount]);

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
	}, []);

	const handleStayOnCurrentTopic = useCallback(() => {
		hasShownInitialTopicPromptRef.current = true;
		setShowNextTopicPrompt(false);
	}, []);

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

	return (
		<KeyboardAvoidingView
			behavior={Platform.OS === "ios" ? "padding" : "height"}
			style={{ flex: 1 }}
		>
		<SafeAreaView
				mode="padding"
				style={[styles.page, style]}
				{...restViewProps}
			>
				<View style={trainingAppWrapperStyles.headerRow}>
					<WText
						mode="primary"
						size="2xl"
						style={trainingAppWrapperStyles.title}
					>
						{currentTitle}
					</WText>
					<Link
						href="/authorized/learning"
						style={trainingAppWrapperStyles.closeLink}
					>
						<AntDesign name="close" size={16} color={Colors.greys.white} />
					</Link>
				</View>

				<View style={{ marginTop: 12 }}>
					<TrainingProgressBar flashTrigger={progressFlashTrigger} />
				</View>

				{currentExercise === "choose_translation" && (
					<ChooseTranslationExercise />
				)}
				{currentExercise === "listening_practice" && (
					<ListeningPracticeExercise />
				)}
				{currentExercise === "match_words" && <MatchWordsExercise />}
				{currentExercise === "true_or_false" && <TrueOrFalseExercise />}
				{currentExercise === "type_word" && <TypeWordExercise />}
				{currentExercise === "cards" && <CardsExercise />}

				{showNextTopicPrompt && nextTopicId != null && (
					<View style={trainingAppWrapperStyles.masteredPromptOverlay}>
						<WCard style={trainingAppWrapperStyles.masteredPromptCard}>
							<WText
								mode="primary"
								size="xl"
								style={trainingAppWrapperStyles.masteredPromptTitle}
							>
								{t("topic_mastered_title")}
							</WText>
							<WText
								mode="secondary"
								size="md"
								style={trainingAppWrapperStyles.masteredPromptDescription}
							>
								{t("topic_mastered_description", {
									topic: nextTopicTitle ?? "",
								})}
							</WText>
							<View style={trainingAppWrapperStyles.masteredPromptActions}>
								<WButton mode="dark" fullWidth onPress={handleStayOnCurrentTopic}>
									<WText>{t("topic_mastered_stay")}</WText>
								</WButton>
								<WButton mode="primary" fullWidth onPress={handleOpenNextTopic}>
									<WText mode="inverted">{t("topic_mastered_next")}</WText>
								</WButton>
							</View>
						</WCard>
					</View>
				)}

				{showMasteredPrompt && exercise && !showNextTopicPrompt && (
					<View style={trainingAppWrapperStyles.masteredPromptOverlay}>
						<WCard style={trainingAppWrapperStyles.masteredPromptCard}>
							<WText
								mode="primary"
								size="xl"
								style={trainingAppWrapperStyles.masteredPromptTitle}
							>
								{t("training_mastered_title")}
							</WText>
							<WText
								mode="secondary"
								size="md"
								style={trainingAppWrapperStyles.masteredPromptDescription}
							>
								{t("training_mastered_description")}
							</WText>
							<View style={trainingAppWrapperStyles.masteredPromptActions}>
								<WButton mode="dark" fullWidth onPress={handleContinueCurrentTraining}>
									<WText>{t("training_mastered_stay")}</WText>
								</WButton>
								<WButton
									mode="primary"
									fullWidth
									onPress={handleOpenNextTraining}
								>
									<WText mode="inverted">{t("training_mastered_next")}</WText>
								</WButton>
							</View>
						</WCard>
					</View>
				)}
			</SafeAreaView>
		</KeyboardAvoidingView>
	);
};
