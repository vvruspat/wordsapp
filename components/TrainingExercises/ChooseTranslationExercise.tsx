import { PlayWordButton } from "@/components/PlayWordButton";
import { useExercise } from "@/hooks/useExercise";
import { WButton, WText } from "@/mob-ui";
import { shuffleArray } from "@/utils";
import { useCallback, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { ExerciseProps } from "./common";
import { TrainingPromptCard } from "./TrainingPromptCard";

const score = 0.2;

export function ChooseTranslationExercise({ onFinish }: ExerciseProps) {
	const {
		onFailure,
		onSuccess,
		getWord,
		getTranslation,
		getRandomTranslations,
	} = useExercise();

	const word = getWord();
	const translation = getTranslation(word.id);
	const randomTranslations = getRandomTranslations(3, word.catalog, word.topic);

	const options = useMemo(() => {
		const options = [
			translation.translation,
			...randomTranslations.map((t) => t.translation),
		];

		return shuffleArray(Array.from(options)).slice(0, 4);
	}, [randomTranslations, translation.translation]);

	const [selectedOption, setSelectedOption] = useState<string | null>(null);

	const handlePress = useCallback(
		(option: string) => {
			setSelectedOption(option);
			if (option === translation.translation) {
				onSuccess?.(word.id, score, true);
			} else {
				onFailure?.(word.id, score, true);
			}

			onFinish?.();
		},
		[translation, word, onFailure, onSuccess, onFinish],
	);

	return (
		<>
			<TrainingPromptCard word={word.word} transcribtion={word.transcribtion}>
				<PlayWordButton />
			</TrainingPromptCard>

			<View style={styles.buttonsContainer}>
				{options.map((option) => (
					<WButton
						key={option}
						mode={selectedOption === option ? "primary" : "dark"}
						fullWidth
						onPress={() => handlePress(option)}
					>
						<WText>{option}</WText>
					</WButton>
				))}
			</View>
		</>
	);
}

const styles = StyleSheet.create({
	buttonsContainer: {
		width: "100%",
		flexDirection: "column",
		justifyContent: "center",
		alignItems: "center",
		alignContent: "stretch",
		gap: 16,
	},
});
