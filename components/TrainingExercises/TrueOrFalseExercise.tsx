import { PlayWordButton } from "@/components/PlayWordButton";
import { ExerciseFinishContext } from "@/context/ExerciseFinishContext";
import { useExercise } from "@/hooks/useExercise";
import { useSessionUser } from "@/hooks/useSession";
import { WButton, WText } from "@/mob-ui";
import { Word, WordTranslation } from "@repo/types";
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { TrainingPromptCard } from "./TrainingPromptCard";

const score = 0.2;

export function TrueOrFalseExercise() {
	const { t } = useTranslation();
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
					1,
					loadedWord.catalog,
					loadedWord.topic,
					[loadedTranslation],
				);
				setRandomTranslations(loadedRandomTranslations);
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

	const { statement, isCorrect } = useMemo(() => {
		if (!translation || randomTranslations.length === 0) {
			return { statement: "", isCorrect: false };
		}

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
			if (!word || !translation) return;
			const userThinksCorrect = choice === "yes";

			if (userThinksCorrect === isCorrect) {
				onSuccess?.(word.id, score, true, word, translation);
			} else {
				onFailure?.(word.id, score, true, word, translation);
			}
		},
		[isCorrect, word, translation, onFailure, onSuccess],
	);

	if (!word || !translation || randomTranslations.length === 0) {
		return null; // or a loading spinner
	}

	return (
		<>
			<TrainingPromptCard word={word.word} transcribtion={word.transcribtion}>
				<View style={{ gap: 24, alignItems: "center" }}>
					<WText mode="primary" size="xl">
						{statement}
					</WText>
					<PlayWordButton audio={word.audio} />
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
