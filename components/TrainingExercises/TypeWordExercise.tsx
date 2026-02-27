import { useCallback, useContext, useEffect, useState } from "react";
import { WordExcerciseCardResultModal } from "@/components/Modals/WordExcerciseResult";
import { ExerciseContext } from "@/context/ExerciseContext";
import { useExcerciseStore } from "@/hooks/useExcerciseStore";
import { WCharInput, WCharInputProps } from "@/mob-ui";
import { TrainingPromptCard } from "./TrainingPromptCard";

type CharInputStatus = WCharInputProps["status"];

const score = 0.2;

export function TypeWordExercise() {
	const [status, setStatus] = useState<CharInputStatus>("default");
	const [modalVisible, setModalVisible] = useState(false);

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
			if (!word) return "default";
			const normalizedAnswer = word.word.trim().toLowerCase();
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
		[word],
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
				text.trim().length === word.word.trim().length
			) {
				onFailure?.(word.remoteId, score);
			}
		},
		[word, translation, evaluateStatus, onFailure, onSuccess],
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

	if (!word || !translation) {
		return null;
	}

	return (
		<>
			<TrainingPromptCard
				word={translation.translation}
				wordId={word.remoteId}
				onSkip={handleSkip}
			/>

			<WCharInput
				length={word.word.length}
				onChangeText={handleChange}
				status={status}
			/>

			<WordExcerciseCardResultModal
				visible={modalVisible}
				onRequestClose={handleModalClose}
			/>
		</>
	);
}
