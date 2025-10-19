import { PlayWordButton } from "@/components/PlayWordButton";
import { useExercise } from "@/hooks/useExercise";
import { WCharInput, WCharInputProps } from "@/mob-ui";
import { useCallback, useState } from "react";
import { View } from "react-native";
import { ExerciseProps } from "./common";
import { TrainingPromptCard } from "./TrainingPromptCard";

type CharInputStatus = WCharInputProps["status"];

export function TypeTranslationExercise({ onFinish }: ExerciseProps) {
	const [status, setStatus] = useState<CharInputStatus>("default");
	const { onFailure, onSuccess, getWord, getTranslation } = useExercise();

	const word = getWord();
	const translation = getTranslation(word.id);

	const evaluateStatus = useCallback(
		(text: string): CharInputStatus => {
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
			const nextStatus = evaluateStatus(text);
			setStatus(nextStatus);

			if (nextStatus === "success") {
				onSuccess?.(word.id);
				onFinish?.();
			} else if (
				nextStatus === "error" &&
				text.trim().length === translation.translation.trim().length
			) {
				onFailure?.(word.id);
				onFinish?.();
			}
		},
		[translation, word, evaluateStatus, onFailure, onSuccess, onFinish],
	);

	return (
		<>
			<TrainingPromptCard word={word.word} transcribtion={word.transcribtion}>
				<View style={{ gap: 24, alignItems: "center" }}>
					<PlayWordButton />
				</View>
			</TrainingPromptCard>

			<WCharInput
				length={translation.translation.length}
				onChangeText={handleChange}
				status={status}
			/>
		</>
	);
}
