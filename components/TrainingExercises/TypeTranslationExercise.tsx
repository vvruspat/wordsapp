import { useCallback, useContext, useEffect, useState } from "react";
import { View } from "react-native";
import { WordExcerciseCardResultModal } from "@/components/Modals/WordExcerciseResult";
import { PlayWordButton } from "@/components/PlayWordButton";
import { ExerciseContext } from "@/context/ExerciseContext";
import { useExcerciseStore } from "@/hooks/useExcerciseStore";
import { WCharInput, WCharInputProps } from "@/mob-ui";
import { TrainingPromptCard } from "./TrainingPromptCard";

type CharInputStatus = WCharInputProps["status"];

const score = 0.2;

export function TypeTranslationExercise() {
	const [status, setStatus] = useState<CharInputStatus>("default");
	const [modalVisible, setModalVisible] = useState(false);
	const [modalPair, setModalPair] = useState<{
		word: string;
		translation: string;
	} | null>(null);

	const {
		addCompleteListener,
		removeCompleteListener,
		loadData,
		onFailure,
		onSuccess,
		complete,
	} = useContext(ExerciseContext);
	const { currentPairs } = useExcerciseStore();

	const { word, translation } = currentPairs[0] ?? {
		word: null,
		translation: null,
	};

	const load = useCallback(async () => {
		setStatus("default");
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

	const evaluateStatus = useCallback(
		(text: string): CharInputStatus => {
			if (!translation) return "default";
			const normalizedAnswer = translation.translation.trim().toLowerCase();
			const normalizedInput = text.trim().toLowerCase();

			if (
				normalizedInput.length === normalizedAnswer.length &&
				normalizedInput === normalizedAnswer
			) {
				return "success";
			}

			if (normalizedInput.length === normalizedAnswer.length) {
				return "error";
			}

			return normalizedAnswer.startsWith(normalizedInput) ? "default" : "error";
		},
		[translation],
	);

	const handleChange = useCallback(
		(text: string) => {
			if (!word || !translation) return;
			const nextStatus = evaluateStatus(text);
			setStatus(nextStatus);

			if (nextStatus === "success") {
				onSuccess?.(word.remoteId, score);
			} else if (
				nextStatus === "error" &&
				text.trim().length === translation.translation.trim().length
			) {
				onFailure?.(word.remoteId, score);
			}
		},
		[translation, word, evaluateStatus, onFailure, onSuccess],
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

	if (!word || !translation) {
		return null; // or a loading spinner
	}

	return (
		<View style={{ flex: 1, width: "100%" }}>
			<TrainingPromptCard
				word={word.word}
				transcription={word.transcription}
				wordId={word.remoteId}
				onSkip={handleSkip}
			>
				<View style={{ gap: 24, alignItems: "center" }}>
					<PlayWordButton audio={word.audio} />
				</View>
			</TrainingPromptCard>

			<WCharInput
				length={translation.translation.length}
				onChangeText={handleChange}
				status={status}
			/>

			<WordExcerciseCardResultModal
				visible={modalVisible}
				word={modalPair?.word}
				translation={modalPair?.translation}
				onRequestClose={handleModalClose}
			/>
		</View>
	);
}
