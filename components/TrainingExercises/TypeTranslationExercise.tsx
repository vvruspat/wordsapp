import { useCallback, useContext, useEffect, useState } from "react";
import { View } from "react-native";
import { WordExcerciseCardResultModal } from "@/components/Modals/WordExcerciseResult";
import { PlayWordButton } from "@/components/PlayWordButton";
import { ExerciseContext } from "@/context/ExerciseContext";
import { useExcerciseStore } from "@/hooks/useExcerciseStore";
import { WCharInput, WCharInputProps } from "@/mob-ui";
import { synonymGroupsRepository } from "@/db/repositories/synonymGroups.repository";
import { translationsRepository } from "@/db/repositories/translations.repository";
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
			const primaryAnswer = translation.translation.trim().toLowerCase();
			const normalizedInput = text.trim().toLowerCase();

			// All accepted answers of the same length as the primary (WCharInput has fixed length)
			const answers =
				acceptedTranslations.length > 0
					? acceptedTranslations
							.map((t) => t.trim().toLowerCase())
							.filter((t) => t.length === primaryAnswer.length)
					: [primaryAnswer];

			if (normalizedInput.length === primaryAnswer.length) {
				return answers.some((a) => a === normalizedInput) ? "success" : "error";
			}

			return answers.some((a) => a.startsWith(normalizedInput)) ? "default" : "error";
		},
		[translation, acceptedTranslations],
	);

	const handleChange = useCallback(
		(text: string) => {
			if (!word || !translation) return;
			const nextStatus = evaluateStatus(text);
			setStatus(nextStatus);

			if (nextStatus === "success") {
				onSuccess?.(word.remoteId, score);
			} else if (nextStatus === "error" && text.trim().length === translation.translation.trim().length) {
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
				meaning={word.meaning}
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
