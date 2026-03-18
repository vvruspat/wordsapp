import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { WordExcerciseCardResultModal } from "@/components/Modals/WordExcerciseResult";
import { PlayWordButton } from "@/components/PlayWordButton";
import { ExerciseContext } from "@/context/ExerciseContext";
import { synonymGroupsRepository } from "@/db/repositories/synonymGroups.repository";
import { translationsRepository } from "@/db/repositories/translations.repository";
import { useExcerciseStore } from "@/hooks/useExcerciseStore";
import { WButton, WText } from "@/mob-ui";
import { shuffleArray } from "@/utils";
import { TrainingPromptCard } from "./TrainingPromptCard";

const score = 0.2;

export function ChooseTranslationExercise() {
	const [modalVisible, setModalVisible] = useState(false);

	const {
		addCompleteListener,
		removeCompleteListener,
		loadData,
		onFailure,
		onSuccess,
		complete,
	} = useContext(ExerciseContext);
	const { currentPairs, currentRandomTranslations: randomTranslations } =
		useExcerciseStore();

	const { word, translation } = currentPairs[0] ?? {
		word: null,
		translation: null,
	};

	const [acceptedTranslations, setAcceptedTranslations] = useState<string[]>(
		[],
	);

	const wordRemoteId = word?.remoteId;
	const wordLanguage = word?.language;
	const translationLanguage = translation?.language;

	useEffect(() => {
		setSelection(null);
		setAcceptedTranslations([]);
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

	const options = useMemo(() => {
		if (!translation || randomTranslations.length === 0) {
			return [];
		}

		const correctText = translation.translation;
		const distractors = randomTranslations
			.map((t) => t.translation)
			.filter((t) => t !== correctText)
			.slice(0, 3);

		return shuffleArray([correctText, ...distractors]);
	}, [randomTranslations, translation]);

	const [selection, setSelection] = useState<{
		wordId: number;
		option: string;
	} | null>(null);
	const [modalPair, setModalPair] = useState<{
		word: string;
		translation: string;
	} | null>(null);

	const handlePress = useCallback(
		(option: string) => {
			if (!word || !translation) return;

			setSelection({ wordId: word.remoteId, option });

			const isAccepted =
				acceptedTranslations.length > 0
					? acceptedTranslations.includes(option)
					: option === translation.translation;

			if (isAccepted) {
				onSuccess?.(word.remoteId, score);
			} else {
				onFailure?.(word.remoteId, score);
			}
		},
		[translation, word, acceptedTranslations, onFailure, onSuccess],
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
		return null; // or a loading spinner
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
				<PlayWordButton audio={word.audio} />
			</TrainingPromptCard>

			<View style={styles.buttonsContainer}>
				{options.map((option) => (
					<WButton
						key={option}
						mode={
							selection?.wordId === wordRemoteId && selection?.option === option
								? "primary"
								: "dark"
						}
						fullWidth
						onPress={() => handlePress(option)}
					>
						<WText>{option}</WText>
					</WButton>
				))}
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
	buttonsContainer: {
		width: "100%",
		flexDirection: "column",
		justifyContent: "center",
		alignItems: "center",
		alignContent: "stretch",
		gap: 16,
	},
});
