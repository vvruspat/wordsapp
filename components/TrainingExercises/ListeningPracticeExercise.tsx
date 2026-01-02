import { PlayWordButton } from "@/components/PlayWordButton";
import { ExerciseContext } from "@/context/ExerciseContext";
import { useExcerciseStore } from "@/hooks/useExcerciseStore";
import { WButton, WText } from "@/mob-ui";
import { shuffleArray } from "@/utils";
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { TrainingPromptCard } from "./TrainingPromptCard";

const score = 0.2;

export function ListeningPracticeExercise() {
	console.log("ListeningPracticeExercise");

	const {
		addCompleteListener,
		removeCompleteListener,
		loadData,
		onFailure,
		onSuccess,
	} = useContext(ExerciseContext);
	const { currentPairs, currentRandomTranslations: randomTranslations } =
		useExcerciseStore();

	const { word, translation } = currentPairs[0] ?? {
		word: null,
		translation: null,
	};

	const load = useCallback(async () => {
		await loadData(1, 0, 3);
	}, [loadData]);

	const onExerciseComplete = useCallback(async () => {
		await load();
	}, [load]);

	useEffect(() => {
		load();
	}, [load]);

	useEffect(() => {
		addCompleteListener(onExerciseComplete);
		return () => removeCompleteListener(onExerciseComplete);
	}, [addCompleteListener, removeCompleteListener, onExerciseComplete]);

	const options = useMemo(() => {
		if (!translation || randomTranslations.length === 0) {
			return [];
		}

		const options = [
			translation.translation,
			...randomTranslations.map((t) => t.translation),
		];

		return shuffleArray(Array.from(options));
	}, [randomTranslations, translation]);

	const [selectedOption, setSelectedOption] = useState<string | null>(null);

	const handlePress = useCallback(
		(option: string) => {
			if (!word || !translation) return;
			setSelectedOption(option);
			if (option === translation.translation) {
				onSuccess?.(word.remoteId, score);
			} else {
				onFailure?.(word.remoteId, score);
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
