import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { WordExcerciseCardResultModal } from "@/components/Modals/WordExcerciseResult";
import { PlayWordButton } from "@/components/PlayWordButton";
import { ExerciseContext } from "@/context/ExerciseContext";
import { useExcerciseStore } from "@/hooks/useExcerciseStore";
import { useSwipeAnimation } from "@/hooks/useSwipeAnimation";
import { WButton, WText } from "@/mob-ui";
import { shuffleArray } from "@/utils";
import { TrainingPromptCard } from "./TrainingPromptCard";

const score = 0.2;

export function ListeningPracticeExercise() {
	const [modalVisible, setModalVisible] = useState(false);
	const [modalPair, setModalPair] = useState<{
		word: string;
		translation: string;
	} | null>(null);
	const [answered, setAnswered] = useState(false);
	const [selectedOption, setSelectedOption] = useState<string | null>(null);

	const { translateX, buttonAnims, swipeOut, notifyContentChanged } = useSwipeAnimation(4);

	const {
		addCompleteListener,
		removeCompleteListener,
		loadData,
		onFailure,
		onSuccess,
		complete,
		triggerLike,
	} = useContext(ExerciseContext);
	const { currentPairs, currentRandomTranslations: randomTranslations } =
		useExcerciseStore();

	const { word, translation } = currentPairs[0] ?? {
		word: null,
		translation: null,
	};

	const [loadKey, setLoadKey] = useState(0);

	const load = useCallback(async () => {
		await loadData(1, 0, 3);
	}, [loadData]);

	const onExerciseComplete = useCallback(() => {
		swipeOut(() => {
			setAnswered(false);
			setSelectedOption(null);
			setLoadKey((k) => k + 1);
		});
	}, [swipeOut]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: loadKey is a re-trigger counter, not used inside the effect body
	useEffect(() => {
		load();
	}, [load, loadKey]);

	useEffect(() => {
		addCompleteListener(onExerciseComplete);
		return () => removeCompleteListener(onExerciseComplete);
	}, [addCompleteListener, removeCompleteListener, onExerciseComplete]);

	const options = useMemo(() => {
		if (!translation || randomTranslations.length === 0) return [];
		const opts = [
			translation.translation,
			...randomTranslations.map((t) => t.translation),
		];
		return shuffleArray(Array.from(opts));
	}, [randomTranslations, translation]);

	useEffect(() => {
		if (word && options.length > 0) {
			notifyContentChanged();
		}
	}, [word, options, notifyContentChanged]);

	const handlePress = useCallback(
		(option: string) => {
			if (!word || !translation || answered) return;
			setSelectedOption(option);
			setAnswered(true);

			if (option === translation.translation) {
				triggerLike();
				onSuccess?.(word.remoteId, score, false);
				complete();
			} else {
				onFailure?.(word.remoteId, score);
			}
		},
		[translation, word, answered, complete, triggerLike, onFailure, onSuccess],
	);

	const handleSkip = useCallback(() => {
		if (!word || !translation) return;
		onFailure?.(word.remoteId, score, false);
		setModalPair({ word: word.word, translation: translation.translation });
		setModalVisible(true);
	}, [word, translation, onFailure]);

	const handleModalClose = useCallback(() => {
		setModalVisible(false);
		complete();
	}, [complete]);

	if (!word || !translation || options.length === 0) {
		return null;
	}

	return (
		<>
			<View style={styles.wrapper}>
				<Animated.View
					style={[styles.content, { transform: [{ translateX }] }]}
				>
					<TrainingPromptCard wordId={word.remoteId} onSkip={handleSkip}>
						<PlayWordButton
							key={word.remoteId}
							autoplay
							audio={word.audio}
						/>
					</TrainingPromptCard>
				</Animated.View>

				<View style={styles.buttonsContainer}>
					{options.map((option, i) => (
						<Animated.View
							key={option}
							style={[
								styles.buttonWrapper,
								buttonAnims[i] ? { transform: [{ translateX: buttonAnims[i] }] } : undefined,
							]}
						>
							<WButton
								mode={selectedOption === option ? "primary" : "dark"}
								fullWidth
								onPress={() => handlePress(option)}
							>
								<WText>{option}</WText>
							</WButton>
						</Animated.View>
					))}
				</View>
			</View>

			<WordExcerciseCardResultModal
				visible={modalVisible}
				word={modalPair?.word}
				translation={modalPair?.translation}
				onRequestClose={handleModalClose}
			/>
		</>
	);
}

const styles = StyleSheet.create({
	wrapper: {
		flex: 1,
		width: "100%",
		overflow: "hidden",
	},
	content: {
		flex: 1,
		width: "100%",
	},
	buttonsContainer: {
		width: "100%",
		flexDirection: "column",
		justifyContent: "center",
		alignItems: "center",
		alignContent: "stretch",
		gap: 16,
		overflow: "hidden",
	},
	buttonWrapper: {
		width: "100%",
	},
});
