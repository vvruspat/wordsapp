import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { WordExcerciseCardResultModal } from "@/components/Modals/WordExcerciseResult";
import { PlayWordButton } from "@/components/PlayWordButton";
import { ExerciseContext } from "@/context/ExerciseContext";
import { useExcerciseStore } from "@/hooks/useExcerciseStore";
import { WButton, WText } from "@/mob-ui";
import { shuffleArray } from "@/utils";
import { TrainingPromptCard } from "./TrainingPromptCard";

const score = 0.2;

export function ChooseTranslationExercise() {
	const [modalVisible, setModalVisible] = useState(false);

	const {
		addCompleteListener,
		removeCompleteListener,
		loadData,
		onFailure,
		onSuccess,
		complete,
	} = useContext(ExerciseContext);
	const { currentPairs, currentRandomTranslations: randomTranslations } =
		useExcerciseStore();

	const { word, translation } = currentPairs[0] ?? {
		word: null,
		translation: null,
	};

	const load = useCallback(async () => {
		await loadData(1, 0, 4);
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

		return shuffleArray(Array.from(options)).slice(0, 4);
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

	const handleSkip = useCallback(() => {
		if (!word || !translation) return;
		onFailure?.(word.remoteId, score, false);
		setModalVisible(true);
	}, [word, translation, onFailure]);

	const handleModalClose = useCallback(() => {
		setModalVisible(false);
		complete();
	}, [complete]);

	if (!word || !translation || options.length === 0) {
		return null; // or a loading spinner
	}

	return (
		<>
			<TrainingPromptCard
				word={word.word}
				transcribtion={word.transcribtion}
				wordId={word.remoteId}
				onSkip={handleSkip}
			>
				<PlayWordButton audio={word.audio} />
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

			<WordExcerciseCardResultModal
				visible={modalVisible}
				onRequestClose={handleModalClose}
			/>
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
