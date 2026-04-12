import { BackgroundContext } from "@/context/BackgroundContext";
import { ExerciseContext } from "@/context/ExerciseContext";
import { learningRepository } from "@/db/repositories/learning.repository";
import { topicsRepository } from "@/db/repositories/topics.repository";
import { wordsRepository } from "@/db/repositories/words.repository";
import { styles } from "@/general.styles";
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
	const {
		addCompleteListener,
		removeCompleteListener,
		setCurrentTrainingId,
		sessionStats: { successCount, totalCount, successEventCount },
	} = useContext(ExerciseContext);
	const { setColor, setOpacity } = useContext(BackgroundContext);
	const { user } = useSessionUser();
	const { currentCatalogs, currentTopics, setCurrentTopics } = useExcerciseStore();

	const orderedTrainingIds = useMemo(
		() =>
			(Object.keys(EXERCISES_APPS) as LearningTrainingName[]).filter(
				(trainingId) => !excludedExercises.includes(trainingId),
			),
		[excludedExercises],
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
			(training) => !excludedExercises.includes(training.id),
		);
		const randomTraining = shuffleArray(availableTrainings)[0];

		if (!randomTraining) {
			return;
		}

		setCurrentExercise(randomTraining.id);
		setCurrentTitle(t(randomTraining.titleId));
		setColor(randomTraining.backgroundColor);
		setOpacity(1);
	}, [excludedExercises, t, setColor, setOpacity]);

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

	useEffect(() => {
		let isMounted = true;
		let unsubscribe: (() => void) | undefined;

		const selectedTopicId = currentTopics.length === 1 ? currentTopics[0] : null;

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

		const loadTopicProgress = async () => {
			const [topics, words] = await Promise.all([
				topicsRepository.getByLanguage(user.language_learn),
				wordsRepository.getByTopicIds(currentTopics, currentCatalogs),
			]);

			if (!isMounted) {
				return;
			}

			const sortedTopics = topics.sort((a, b) => a.title.localeCompare(b.title));
			const availableTopicIds = await wordsRepository.getTopicsByCatalogs(currentCatalogs);
			const filteredTopics = sortedTopics.filter((topic) =>
				availableTopicIds.has(topic.remoteId),
			);
			const currentTopicIndex = filteredTopics.findIndex(
				(topic) => topic.remoteId === selectedTopicId,
			);
			const nextTopic = currentTopicIndex >= 0 ? filteredTopics[currentTopicIndex + 1] : null;

			setNextTopicId(nextTopic?.remoteId ?? null);
			setNextTopicTitle(nextTopic?.title ?? null);

			const syncProgress = (progressRecords: Awaited<ReturnType<typeof learningRepository.getByUser>>) => {
				const stats = buildTopicProgressStats(words, progressRecords);
				const topicStats = stats.get(selectedTopicId);
				setIsCurrentTopicComplete(
					Boolean(topicStats && topicStats.total > 0 && topicStats.learned >= topicStats.total),
				);
			};

			syncProgress(await learningRepository.getByUser(user.userId));

			const subscription = learningRepository
				.observeByUser(user.userId)
				.subscribe(syncProgress);
			unsubscribe = () => subscription.unsubscribe();
		};

		loadTopicProgress().catch(() => {
			if (!isMounted) {
				return;
			}

			setIsCurrentTopicComplete(false);
			setNextTopicId(null);
			setNextTopicTitle(null);
		});

		return () => {
			isMounted = false;
			unsubscribe?.();
		};
	}, [currentCatalogs, currentTopics, user?.language_learn, user?.userId]);

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
				setShowMasteredPrompt(true);
			}, 900);
		}

		previousMasteredRef.current = isMastered;
	}, [exercise, isCurrentTopicComplete, successCount, successEventCount, totalCount]);

	useEffect(() => {
		const selectedTopicId = currentTopics.length === 1 ? currentTopics[0] : null;

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
			nextTopicId != null
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
	}, [currentTopics, isCurrentTopicComplete, nextTopicId, successEventCount]);

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
	}, [nextTopicId, setCurrentTopics]);

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
