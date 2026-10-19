import { styles } from "@/general.styles";
import { WButton, WCard, WText } from "@/mob-ui";
import { Colors } from "@/mob-ui/brand/colors";
import AntDesign from "@expo/vector-icons/AntDesign";
import { Link, router } from "expo-router";
import {
	ActivityIndicator,
	KeyboardAvoidingView,
	Platform,
	View,
} from "react-native";
import {
	SafeAreaView,
	SafeAreaViewProps,
} from "react-native-safe-area-context";
import type { LearningTrainingName } from "@/shared/progress/exercises";
import { useTrainingPresentation } from "@/features/training/hooks/useTrainingPresentation";
import {
	CardsExercise,
	ChooseTranslationExercise,
	ListeningPracticeExercise,
	MatchWordsExercise,
	TrueOrFalseExercise,
	TypeWordExercise,
} from "@/features/training/components/exercises";
import { TrainingProgressBar } from "@/features/training/components/TrainingProgressBar";
import { trainingAppWrapperStyles } from "@/features/training/components/TrainingAppWrapper/TrainingAppWrapper.styles";

type TrainingAppWrapperProps = SafeAreaViewProps & {
	title?: string;
	exercise?: LearningTrainingName;
	excludedExercises?: LearningTrainingName[];
};

const DEFAULT_EXCLUDED_EXERCISES: LearningTrainingName[] = [];

export const TrainingAppWrapper = ({
	title = "",
	exercise,
	excludedExercises = DEFAULT_EXCLUDED_EXERCISES,
	children,
	style,
	...restViewProps
}: TrainingAppWrapperProps) => {
	const {
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
	} = useTrainingPresentation(exercise, excludedExercises);

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
						{mixComplete ? t("mix_training_title") : currentTitle}
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

				{trainingStatus === "error" ||
				(!exercise && (mixComplete || selectionError)) ? (
					<View style={trainingAppWrapperStyles.audioUnavailable}>
						<WCard style={trainingAppWrapperStyles.audioUnavailableCard}>
							<WText wrap>
								{t(
									selectionError || trainingStatus === "error"
										? "mix_training_error"
										: "mix_training_completed",
								)}
							</WText>
							{selectionError || trainingStatus === "error" ? (
								<WButton
									mode="primary"
									onPress={() => {
										if (trainingStatus === "error") void retryTraining?.();
										else void setRandomExercise();
									}}
								>
									<WText mode="inverted">{t("button_retry")}</WText>
								</WButton>
							) : null}
							<WButton mode="dark" onPress={() => router.back()}>
								<WText>{t("button_close")}</WText>
							</WButton>
						</WCard>
					</View>
				) : !isExerciseReady || isSelectingExercise ? (
					<View style={trainingAppWrapperStyles.loading}>
						<ActivityIndicator color={Colors.primary.base} />
					</View>
				) : totalCount === 0 ? (
					<View style={trainingAppWrapperStyles.audioUnavailable}>
						<WCard style={trainingAppWrapperStyles.audioUnavailableCard}>
							<WText
								mode="primary"
								size="lg"
								style={trainingAppWrapperStyles.audioUnavailableText}
							>
								{t("mix_training_no_words")}
							</WText>
						</WCard>
					</View>
				) : (
					<>
						{currentPairs.length === 0 && (
							<View style={trainingAppWrapperStyles.loading}>
								<ActivityIndicator color={Colors.primary.base} />
							</View>
						)}
						{currentExercise === "choose_translation" && (
							<ChooseTranslationExercise />
						)}
						{isListeningAudioUnavailable ? (
							<View style={trainingAppWrapperStyles.audioUnavailable}>
								<WCard style={trainingAppWrapperStyles.audioUnavailableCard}>
									<WText
										mode="primary"
										size="lg"
										style={trainingAppWrapperStyles.audioUnavailableText}
									>
										{t("sync_status_audio")}
									</WText>
								</WCard>
							</View>
						) : currentExercise === "listening_practice" ? (
							<ListeningPracticeExercise />
						) : null}
						{currentExercise === "match_words" && <MatchWordsExercise />}
						{currentExercise === "true_or_false" && <TrueOrFalseExercise />}
						{currentExercise === "type_word" && <TypeWordExercise />}
						{currentExercise === "cards" && <CardsExercise />}
					</>
				)}

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
								<WButton
									mode="dark"
									fullWidth
									onPress={handleStayOnCurrentTopic}
								>
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
								<WButton
									mode="dark"
									fullWidth
									onPress={handleContinueCurrentTraining}
								>
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
