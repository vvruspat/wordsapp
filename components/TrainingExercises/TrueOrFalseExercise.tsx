import { PlayWordButton } from "@/components/PlayWordButton";
import { useExercise } from "@/hooks/useExercise";
import { WButton, WText } from "@/mob-ui";
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { ExerciseProps } from "./common";
import { TrainingPromptCard } from "./TrainingPromptCard";

export function TrueOrFalseExercise({ onFinish }: ExerciseProps) {
	const { t } = useTranslation();

	const {
		onFailure,
		onSuccess,
		getWord,
		getTranslation,
		getRandomTranslations,
	} = useExercise();

	const word = getWord();
	const translation = getTranslation(word.id);
	const randomTranslations = getRandomTranslations(1, word.catalog, word.topic);

	const { statement, isCorrect } = useMemo(() => {
		const shouldUseCorrect = Math.random() >= 0.5;

		return {
			statement: shouldUseCorrect
				? translation.translation
				: randomTranslations[0].translation,
			isCorrect: shouldUseCorrect,
		};
	}, [translation, randomTranslations]);

	const handleAnswer = useCallback(
		(choice: "yes" | "no") => {
			const userThinksCorrect = choice === "yes";

			if (userThinksCorrect === isCorrect) {
				onSuccess?.(word.id);
			} else {
				onFailure?.(word.id);
			}

			onFinish?.();
		},
		[isCorrect, word, onFailure, onSuccess, onFinish],
	);

	return (
		<>
			<TrainingPromptCard word={word.word} transcribtion={word.transcribtion}>
				<View style={{ gap: 24, alignItems: "center" }}>
					<WText mode="primary" size="xl">
						{statement}
					</WText>
					<PlayWordButton />
				</View>
			</TrainingPromptCard>

			<View
				style={{
					width: "100%",
					flexDirection: "row",
					justifyContent: "center",
					alignItems: "center",
					alignContent: "stretch",
					gap: 24,
				}}
			>
				<WButton mode="dark" stretch onPress={() => handleAnswer("yes")}>
					<WText>{t("true_or_false_yes")}</WText>
				</WButton>
				<WButton mode="dark" stretch onPress={() => handleAnswer("no")}>
					<WText>{t("true_or_false_no")}</WText>
				</WButton>
			</View>
		</>
	);
}
