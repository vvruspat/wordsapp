import { useCallback, useContext, useEffect, useState } from "react";
import { View } from "react-native";
import { WordExcerciseCardResultModal } from "@/components/Modals/WordExcerciseResult";
import { ExerciseContext } from "@/context/ExerciseContext";
import { synonymGroupsRepository } from "@/db/repositories/synonymGroups.repository";
import { translationsRepository } from "@/db/repositories/translations.repository";
import { wordsRepository } from "@/db/repositories/words.repository";
import { useExcerciseStore } from "@/hooks/useExcerciseStore";
import { WCharInput, WCharInputProps } from "@/mob-ui";
import { TrainingPromptCard } from "./TrainingPromptCard";

type CharInputStatus = WCharInputProps["status"];

const score = 0.2;

export function TypeWordExercise() {
	const [status, setStatus] = useState<CharInputStatus>("default");
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
	const { currentPairs } = useExcerciseStore();

	const { word, translation } = currentPairs[0] ?? {
		word: null,
		translation: null,
	};

	const [acceptedWords, setAcceptedWords] = useState<string[]>([]);

	const wordRemoteId = word?.remoteId;
	const wordLanguage = word?.language;
	const translationRemoteId = translation?.remoteId;
	const translationText = translation?.translation;
	const translationLanguage = translation?.language;

	useEffect(() => {
		if (!wordRemoteId || !wordLanguage || !translationRemoteId || !translationText || !translationLanguage) return;
		(async () => {
			const synonymIds = await synonymGroupsRepository.getSynonymWordIds(
				wordRemoteId,
				wordLanguage,
			);
			const translationMatches = await translationsRepository.getByTranslationText(
				translationText,
				translationLanguage,
			);
			const allWordIds = [
				...new Set([...synonymIds, ...translationMatches.map((t) => t.word)]),
			];
			const ws = await wordsRepository.getByRemoteIds(allWordIds, wordLanguage);
			setAcceptedWords(ws.map((w) => w.word));
		})();
	}, [wordRemoteId, wordLanguage, translationRemoteId, translationText, translationLanguage]);

	const load = useCallback(async () => {
		setStatus("default");
		await loadData(1, 0, 4);
	}, [loadData]);

	const onExerciseComplete = useCallback(async () => {
		setAnswered(false);
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
			const primaryAnswer = word.word.trim().toLowerCase();
			const normalizedInput = text.trim().toLowerCase();
			const answers =
				acceptedWords.length > 0
					? acceptedWords
							.map((w) => w.trim().toLowerCase())
							.filter((w) => w.length === primaryAnswer.length)
					: [primaryAnswer];

			if (normalizedInput.length === primaryAnswer.length) {
				return answers.some((a) => a === normalizedInput) ? "success" : "error";
			}
			return answers.some((a) => a.startsWith(normalizedInput)) ? "default" : "error";
		},
		[word, acceptedWords],
	);

	const handleChange = useCallback(
		(text: string) => {
			if (!word || !translation || answered) return;
			const nextStatus = evaluateStatus(text);
			setStatus(nextStatus);

			if (nextStatus === "success") {
				setAnswered(true);
				triggerLike();
				onSuccess?.(word.remoteId, score, false);
				complete();
			} else if (nextStatus === "error" && text.trim().length === word.word.trim().length) {
				onFailure?.(word.remoteId, score);
			}
		},
		[word, translation, answered, complete, triggerLike, evaluateStatus, onFailure, onSuccess],
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
		return null;
	}

	return (
		<View style={{ flex: 1, width: "100%" }}>
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
				word={modalPair?.word}
				translation={modalPair?.translation}
				onRequestClose={handleModalClose}
			/>
		</View>
	);
}
