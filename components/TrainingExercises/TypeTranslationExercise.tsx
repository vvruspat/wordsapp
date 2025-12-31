import { PlayWordButton } from "@/components/PlayWordButton";
import { ExerciseFinishContext } from "@/context/ExerciseFinishContext";
import { useExercise } from "@/hooks/useExercise";
import { useSessionUser } from "@/hooks/useSession";
import { WCharInput, WCharInputProps } from "@/mob-ui";
import { Word, WordTranslation } from "@repo/types";
import { useCallback, useContext, useEffect, useState } from "react";
import { View } from "react-native";
import { TrainingPromptCard } from "./TrainingPromptCard";

type CharInputStatus = WCharInputProps["status"];

const score = 0.2;

export function TypeTranslationExercise() {
	console.log("TypeTranslationExercise");
	const [status, setStatus] = useState<CharInputStatus>("default");
	const { user } = useSessionUser();
	const { onFailure, onSuccess, getWord, getTranslation } = useExercise();

	const [word, setWord] = useState<Word | null>(null);
	const [translation, setTranslation] = useState<WordTranslation | null>(null);

	const loadWord = useCallback(
		async (retryCount = 0): Promise<void> => {
			const MAX_RETRIES = 5;

			try {
				const loadedWord = await getWord();
				const loadedTranslation = await getTranslation(loadedWord.id);
				setWord(loadedWord);
				setTranslation(loadedTranslation);
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
					return loadWord(retryCount + 1);
				}
				// If max retries reached or different error, log and stop
				console.error("Failed to load exercise data after retries:", error);
			}
		},
		[getWord, getTranslation],
	);

	useEffect(() => {
		// Wait for user to be loaded before attempting to load exercise data
		if (!user?.language_learn) {
			return;
		}
		loadWord();
	}, [user, loadWord]);

	const onExcerciseFinish = useCallback(async () => {
		setStatus("default");
		await loadWord();
	}, [loadWord]);

	const { registerFinishCallback } = useContext(ExerciseFinishContext);

	useEffect(() => {
		registerFinishCallback(onExcerciseFinish);
	}, [onExcerciseFinish, registerFinishCallback]);

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
				onSuccess?.(word.id, score, true, word, translation);
			} else if (
				nextStatus === "error" &&
				text.trim().length === translation.translation.trim().length
			) {
				onFailure?.(word.id, score, true, word, translation);
			}
		},
		[translation, word, evaluateStatus, onFailure, onSuccess],
	);

	if (!word || !translation) {
		return null; // or a loading spinner
	}

	return (
		<>
			<TrainingPromptCard word={word.word} transcribtion={word.transcribtion}>
				<View style={{ gap: 24, alignItems: "center" }}>
					<PlayWordButton audio={word.audio} />
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
