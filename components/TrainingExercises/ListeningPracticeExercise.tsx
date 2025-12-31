import { PlayWordButton } from "@/components/PlayWordButton";
import { ExerciseFinishContext } from "@/context/ExerciseFinishContext";
import { useExercise } from "@/hooks/useExercise";
import { useSessionUser } from "@/hooks/useSession";
import { WButton, WText } from "@/mob-ui";
import { shuffleArray } from "@/utils";
import { Word, WordTranslation } from "@repo/types";
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { TrainingPromptCard } from "./TrainingPromptCard";

const score = 0.2;

export function ListeningPracticeExercise() {
	console.log("ListeningPracticeExercise");
	const { user } = useSessionUser();

	const {
		onFailure,
		onSuccess,
		getWord,
		getTranslation,
		getRandomTranslations,
	} = useExercise();

	const { registerFinishCallback } = useContext(ExerciseFinishContext);

	const [word, setWord] = useState<Word | null>(null);
	const [translation, setTranslation] = useState<WordTranslation | null>(null);
	const [randomTranslations, setRandomTranslations] = useState<
		WordTranslation[]
	>([]);

	const loadData = useCallback(
		async (retryCount = 0): Promise<void> => {
			if (!user?.language_learn) {
				return;
			}

			const MAX_RETRIES = 5;

			try {
				const loadedWord = await getWord();
				const loadedTranslation = await getTranslation(loadedWord.id);
				setWord(loadedWord);
				setTranslation(loadedTranslation);
				const loadedRandomTranslations = await getRandomTranslations(
					3,
					loadedWord.catalog,
					loadedWord.topic,
					[loadedTranslation],
				);
				setRandomTranslations(loadedRandomTranslations);
				setSelectedOption(null);
			} catch (error) {
				console.error("Failed to load exercise data:", error);
				if (
					error instanceof Error &&
					error.message.includes("No translation found") &&
					retryCount < MAX_RETRIES
				) {
					// Retry with a new word if translation is missing
					console.log(
						`Retrying with new word (attempt ${retryCount + 1}/${MAX_RETRIES})`,
					);
					return loadData(retryCount + 1);
				}
				// If max retries reached or different error, log and stop
				console.error("Failed to load exercise data after retries:", error);
			}
		},
		[user, getWord, getTranslation, getRandomTranslations],
	);

	useEffect(() => {
		loadData();
	}, [loadData]);

	useEffect(() => {
		registerFinishCallback(loadData);
	}, [registerFinishCallback, loadData]);

	const options = useMemo(() => {
		if (!translation || randomTranslations.length === 0) {
			return [];
		}

		const options = [
			translation.translation,
			...randomTranslations.map((t) => t.translation),
		];

		return shuffleArray(Array.from(options)).slice(0, 4);
	}, [randomTranslations, translation]);

	const [selectedOption, setSelectedOption] = useState<string | null>(null);

	const handlePress = useCallback(
		(option: string) => {
			if (!word || !translation) return;
			setSelectedOption(option);
			if (option === translation.translation) {
				onSuccess?.(word.id, score, true, word, translation);
			} else {
				onFailure?.(word.id, score, true, word, translation);
			}
		},
		[translation, word, onFailure, onSuccess],
	);

	if (!word || !translation || options.length === 0) {
		return null; // or a loading spinner
	}

	return (
		<>
			<TrainingPromptCard>
				<PlayWordButton autoplay audio={word.audio} />
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
