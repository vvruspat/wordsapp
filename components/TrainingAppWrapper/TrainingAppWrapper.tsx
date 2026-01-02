import { BackgroundContext } from "@/context/BackgroundContext";
import { ExerciseContext } from "@/context/ExerciseContext";
import { styles } from "@/general.styles";
import { WText } from "@/mob-ui";
import { Colors } from "@/mob-ui/brand/colors";
import { shuffleArray } from "@/utils";
import AntDesign from "@expo/vector-icons/AntDesign";
import { Link } from "expo-router";
import { useCallback, useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import {
	SafeAreaView,
	SafeAreaViewProps,
} from "react-native-safe-area-context";
import { LearningTrainingName } from "../LearningCatalog";
import EXERCISES_APPS from "../LearningCatalog/types";
import {
	ChooseTranslationExercise,
	ListeningPracticeExercise,
	MatchWordsExercise,
	TrueOrFalseExercise,
	TypeTranslationExercise,
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
	const { addCompleteListener, removeCompleteListener } =
		useContext(ExerciseContext);
	const { setColor, setOpacity } = useContext(BackgroundContext);

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
		<SafeAreaView
			mode="padding"
			style={[styles.page, style]}
			{...restViewProps}
		>
			<View style={trainingAppWrapperStyles.headerRow}>
				<WText mode="primary" size="2xl" style={trainingAppWrapperStyles.title}>
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
			{currentExercise === "type_translation" && <TypeTranslationExercise />}
		</SafeAreaView>
	);
};

export default TrainingAppWrapper;
