import { PlayWordButton } from "@/components/PlayWordButton";
import { ExerciseContext } from "@/context/ExerciseContext";
import { useExcerciseStore } from "@/hooks/useExcerciseStore";
import { WButton, WText } from "@/mob-ui";
import { useCallback, useContext, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { TrainingPromptCard } from "./TrainingPromptCard";

const score = 0.2;

export function TrueOrFalseExercise() {
	console.log("TrueOrFalseExercise");
	const { t } = useTranslation();

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
				onSuccess?.(word.remoteId, score);
			} else {
				onFailure?.(word.remoteId, score);
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
