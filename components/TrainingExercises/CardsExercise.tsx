import { useCallback, useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { WordExcerciseCardResultModal } from "@/components/Modals/WordExcerciseResult";
import { PlayWordButton } from "@/components/PlayWordButton";
import { ExerciseContext } from "@/context/ExerciseContext";
import { useExcerciseStore } from "@/hooks/useExcerciseStore";
import { WButton, WText } from "@/mob-ui";
import { TrainingPromptCard } from "./TrainingPromptCard";

const score = 0.2;

export function CardsExercise() {
	const { t } = useTranslation();
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
		await loadData(1, 0, 0);
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

	const handleAnswer = useCallback(
		(knows: boolean) => {
			if (!word || !translation) return;
			if (knows) {
				onSuccess(word.remoteId, score, false);
			} else {
				onFailure(word.remoteId, score, false);
			}
			setModalVisible(true);
		},
		[word, translation, onSuccess, onFailure],
	);

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
				word={word.word}
				transcribtion={word.transcribtion}
				wordId={word.remoteId}
			>
				<PlayWordButton audio={word.audio} />
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
				<WButton mode="dark" stretch onPress={() => handleAnswer(false)}>
					<WText>{t("cards_dont_know")}</WText>
				</WButton>
				<WButton mode="dark" stretch onPress={() => handleAnswer(true)}>
					<WText>{t("cards_know")}</WText>
				</WButton>
			</View>

			<WordExcerciseCardResultModal
				visible={modalVisible}
				onRequestClose={handleModalClose}
			/>
		</>
	);
}
