import { getTrainings } from "@/api/training";
import { BackgroundContext } from "@/context/BackgroundContext";
import { ExerciseContext } from "@/context/ExerciseContext";
import { styles } from "@/general.styles";
import { WText } from "@/mob-ui";
import { Colors } from "@/mob-ui/brand/colors";
import { shuffleArray } from "@/utils";
import { logger } from "@/utils/logger";
import AntDesign from "@expo/vector-icons/AntDesign";
import { Link } from "expo-router";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
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
import { trainingAppWrapperStyles } from "./TrainingAppWrapper.styles";

type TrainingAppWrapperProps = SafeAreaViewProps & {
	title?: string;
	exercise?: LearningTrainingName;
};

export const TrainingAppWrapper = ({
	title = "",
	exercise,
	children,
	style,
	...restViewProps
}: TrainingAppWrapperProps) => {
	const { t } = useTranslation();

	const [currentExercise, setCurrentExercise] =
		useState<LearningTrainingName | null>(null);
	const [currentTitle, setCurrentTitle] = useState<string>("");
	const { addCompleteListener, removeCompleteListener, setCurrentTrainingId } =
		useContext(ExerciseContext);
	const { setColor, setOpacity } = useContext(BackgroundContext);

	// Cache training name→id to avoid re-fetching on every exercise change
	const trainingCacheRef = useRef<Record<string, number>>({});

	useEffect(() => {
		if (!currentExercise) return;

		const cached = trainingCacheRef.current[currentExercise];
		if (cached) {
			setCurrentTrainingId(cached);
			return;
		}

		getTrainings({ offset: 0, limit: 100 })
			.then((result) => {
				if (result.status !== "success" || !result.data?.items) return;
				for (const item of result.data.items) {
					trainingCacheRef.current[item.name] = item.id;
				}
				const id = trainingCacheRef.current[currentExercise];
				setCurrentTrainingId(id ?? null);
			})
			.catch((err) =>
				logger.error("Failed to fetch trainings", err, "network"),
			);
	}, [currentExercise, setCurrentTrainingId]);

	const setRandomExercise = useCallback(() => {
		const randomTraining = shuffleArray(Object.values(EXERCISES_APPS))[0];

		setCurrentExercise(randomTraining.id);
		setCurrentTitle(t(randomTraining.titleId));
		setColor(randomTraining.backgroundColor);
		setOpacity(1);
	}, [t, setColor, setOpacity]);

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
			</SafeAreaView>
		</KeyboardAvoidingView>
	);
};
