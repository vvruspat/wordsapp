import { evaluateTypedAnswer } from "../../model/answers";
import { WCharInput } from "@/mob-ui/molecules/WCharInput/WCharInput";
import type { WordPair } from "@/shared/vocabulary/wordsService";
import { useAcceptedAnswers } from "@/shared/vocabulary/useAcceptedAnswers";
import {
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";
import { WordExcerciseCardResultModal } from "@/features/training/components/WordExcerciseResult";
import { ExerciseContext } from "@/features/training/components/ExerciseProvider";
import { WCharInputProps, WText } from "@/mob-ui";
import { TrainingPromptCard } from "@/features/training/components/exercises/TrainingPromptCard";

type CharInputStatus = WCharInputProps["status"];

const score = 0.2;

export function TypeWordExercise() {
	const { wordsPool, loadData, addCompleteListener, removeCompleteListener } =
		useContext(ExerciseContext);
	const load = useCallback(() => {
		void loadData(1, 0, 4);
	}, [loadData]);

	useEffect(() => {
		load();
		addCompleteListener(load);
		return () => removeCompleteListener(load);
	}, [load, addCompleteListener, removeCompleteListener]);

	const pair = wordsPool.currentPairs[0];
	if (!pair || wordsPool.taskKey === null) return null;

	// Reset the entire answer only when the prepared task changes, including a
	// retry of the same word. Native animation callbacks never gate task delivery.
	return <TypeWordTask key={wordsPool.taskKey} pair={pair} />;
}

function TypeWordTask({ pair: { word, translation } }: { pair: WordPair }) {
	const { t } = useTranslation();
	const { onFailure, onSuccess, complete, triggerLike } =
		useContext(ExerciseContext);
	const [status, setStatus] = useState<CharInputStatus>("default");
	const [modalVisible, setModalVisible] = useState(false);
	const [answered, setAnswered] = useState(false);
	const answeredRef = useRef(false);
	const completedRef = useRef(false);
	const [wrongAttempts, setWrongAttempts] = useState(0);
	const wrongAttemptsRef = useRef(0);
	const previousInputLengthRef = useRef(0);

	const wordRemoteId = word.remoteId;
	const wordLanguage = word.language;
	const translationText = translation.translation;
	const translationLanguage = translation.language;
	const targetAnswerLength = word.word.trim().length;
	const maxWrongAttempts = useMemo(
		() => Math.max(1, Math.ceil(targetAnswerLength / 2)),
		[targetAnswerLength],
	);

	const acceptedWords = useAcceptedAnswers(
		"words",
		wordRemoteId,
		wordLanguage,
		translationLanguage,
		translationText,
	);

	const evaluateStatus = useCallback(
		(text: string): CharInputStatus => {
			return evaluateTypedAnswer(text, word.word, acceptedWords);
		},
		[word, acceptedWords],
	);

	const handleChange = useCallback(
		(text: string) => {
			if (answeredRef.current) return;

			const nextStatus = evaluateStatus(text);
			const currentInputLength = text.trim().length;
			const addedCharacters = Math.max(
				0,
				currentInputLength - previousInputLengthRef.current,
			);
			previousInputLengthRef.current = currentInputLength;
			setStatus(nextStatus);

			if (nextStatus === "success") {
				answeredRef.current = true;
				setAnswered(true);
				triggerLike();
				onSuccess?.(word.remoteId, score, false);
				completedRef.current = true;
				complete();
			} else if (nextStatus === "error" && addedCharacters > 0) {
				const nextWrongAttempts = Math.min(
					maxWrongAttempts,
					wrongAttemptsRef.current + addedCharacters,
				);
				wrongAttemptsRef.current = nextWrongAttempts;
				setWrongAttempts(nextWrongAttempts);

				if (nextWrongAttempts >= maxWrongAttempts) {
					answeredRef.current = true;
					setAnswered(true);
					onFailure?.(word.remoteId, score);
					return;
				}
			}
		},
		[
			word,
			complete,
			triggerLike,
			evaluateStatus,
			maxWrongAttempts,
			onFailure,
			onSuccess,
		],
	);

	const handleSkip = useCallback(() => {
		if (answeredRef.current) return;
		answeredRef.current = true;
		setAnswered(true);
		onFailure?.(word.remoteId, score, false);
		setModalVisible(true);
	}, [word, onFailure]);

	const handleModalClose = useCallback(() => {
		if (completedRef.current) return;
		completedRef.current = true;
		setModalVisible(false);
		complete();
	}, [complete]);

	return (
		<View style={styles.wrapper}>
			<View style={styles.content}>
				<TrainingPromptCard
					word={translation.translation}
					wordId={word.remoteId}
					onSkip={handleSkip}
				/>
			</View>

			<WCharInput
				length={word.word.length}
				onChangeText={handleChange}
				status={status}
				editable={!answered}
				displayUppercase={false}
			/>

			<View style={styles.attemptsCounter}>
				<WText mode="secondary" size="sm" align="center">
					{t("type_word_mistakes_counter", {
						current: wrongAttempts,
						max: maxWrongAttempts,
					})}
				</WText>
			</View>

			<WordExcerciseCardResultModal
				visible={modalVisible}
				word={word.word}
				translation={translation.translation}
				onRequestClose={handleModalClose}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	wrapper: {
		flex: 1,
		width: "100%",
		overflow: "hidden",
	},
	content: {
		flex: 1,
		width: "100%",
	},
	attemptsCounter: {
		marginTop: 12,
		width: "100%",
	},
});
