import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { WordExcerciseCardResultModal } from "@/components/Modals/WordExcerciseResult";
import { PlayWordButton } from "@/components/PlayWordButton";
import { ExerciseContext } from "@/context/ExerciseContext";
import { synonymGroupsRepository } from "@/db/repositories/synonymGroups.repository";
import { translationsRepository } from "@/db/repositories/translations.repository";
import { useExcerciseStore } from "@/hooks/useExcerciseStore";
import { WButton, WText } from "@/mob-ui";
import { TrainingPromptCard } from "./TrainingPromptCard";

const score = 0.2;

export function TrueOrFalseExercise() {
	const { t } = useTranslation();
	const [modalVisible, setModalVisible] = useState(false);
	const [modalPair, setModalPair] = useState<{
		word: string;
		translation: string;
	} | null>(null);
	const [answered, setAnswered] = useState(false);

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

	const [acceptedTranslations, setAcceptedTranslations] = useState<string[]>([]);

	const wordRemoteId = word?.remoteId;
	const wordLanguage = word?.language;
	const translationLanguage = translation?.language;

	useEffect(() => {
		if (!wordRemoteId || !wordLanguage || !translationLanguage) return;
		(async () => {
			const synonymIds = await synonymGroupsRepository.getSynonymWordIds(
				wordRemoteId,
				wordLanguage,
			);
			const ts = await translationsRepository.getByWordIds(
				translationLanguage,
				synonymIds,
			);
			setAcceptedTranslations(ts.map((t) => t.translation));
		})();
	}, [wordRemoteId, wordLanguage, translationLanguage]);

	const [loadKey, setLoadKey] = useState(0);

	const load = useCallback(async () => {
		await loadData(1, 0, 4);
	}, [loadData]);

	const onExerciseComplete = useCallback(() => {
		setAnswered(false);
		setLoadKey((k) => k + 1);
	}, []);

	// biome-ignore lint/correctness/useExhaustiveDependencies: loadKey is a re-trigger counter, not used inside the effect body
	useEffect(() => {
		load();
	}, [load, loadKey]);

	useEffect(() => {
		addCompleteListener(onExerciseComplete);
		return () => removeCompleteListener(onExerciseComplete);
	}, [addCompleteListener, removeCompleteListener, onExerciseComplete]);

	const translationText = translation?.translation;
	const firstRandomText = randomTranslations[0]?.translation;
	const randomTranslationsCount = randomTranslations.length;

	const statement = useMemo(() => {
		if (!translationText || randomTranslationsCount === 0 || firstRandomText == null) return "";
		return Math.random() >= 0.5 ? translationText : firstRandomText;
	}, [translationText, firstRandomText, randomTranslationsCount]);

	const handleAnswer = useCallback(
		(choice: "yes" | "no") => {
			if (!word || !translation || answered) return;
			setAnswered(true);

			const userThinksCorrect = choice === "yes";
			const isCorrect =
				acceptedTranslations.length > 0
					? acceptedTranslations.includes(statement)
					: statement === translation.translation;

			if (userThinksCorrect === isCorrect) {
				triggerLike();
				onSuccess?.(word.remoteId, score, false);
				complete();
			} else {
				onFailure?.(word.remoteId, score);
			}
		},
		[statement, acceptedTranslations, answered, complete, triggerLike, word, translation, onFailure, onSuccess],
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

	if (!word || !translation || randomTranslations.length === 0) {
		return null;
	}

	return (
		<>
			<TrainingPromptCard
				word={word.word}
				transcription={word.transcription}
				meaning={word.meaning}
				wordId={word.remoteId}
				onSkip={handleSkip}
			>
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


			<WordExcerciseCardResultModal
				visible={modalVisible}
				word={modalPair?.word}
				translation={modalPair?.translation}
				onRequestClose={handleModalClose}
			/>
		</>
	);
}
