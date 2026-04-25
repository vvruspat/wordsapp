import {
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { useTranslation } from "react-i18next";
import { Animated, StyleSheet, View } from "react-native";
import { WordExcerciseCardResultModal } from "@/components/Modals/WordExcerciseResult";
import { ExerciseContext } from "@/context/ExerciseContext";
import { synonymGroupsRepository } from "@/db/repositories/synonymGroups.repository";
import { translationsRepository } from "@/db/repositories/translations.repository";
import { wordsRepository } from "@/db/repositories/words.repository";
import { useExcerciseStore } from "@/hooks/useExcerciseStore";
import { useSwipeAnimation } from "@/hooks/useSwipeAnimation";
import { WCharInput, WCharInputProps, WText } from "@/mob-ui";
import { TrainingPromptCard } from "./TrainingPromptCard";

type CharInputStatus = WCharInputProps["status"];

const score = 0.2;

export function TypeWordExercise() {
	const { t } = useTranslation();
	const [status, setStatus] = useState<CharInputStatus>("default");
	const [modalVisible, setModalVisible] = useState(false);
	const [modalPair, setModalPair] = useState<{
		word: string;
		translation: string;
	} | null>(null);
	const [answered, setAnswered] = useState(false);
	const [wrongAttempts, setWrongAttempts] = useState(0);
	const [inputResetKey, setInputResetKey] = useState(0);
	const wrongAttemptsRef = useRef(0);
	const previousInputLengthRef = useRef(0);

	const { translateX, swipeOut, notifyContentChanged } = useSwipeAnimation();

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
	const targetAnswerLength = word?.word.trim().length ?? 0;
	const maxWrongAttempts = useMemo(
		() => Math.max(1, Math.ceil(targetAnswerLength / 2)),
		[targetAnswerLength],
	);

	const resetAttempts = useCallback(() => {
		wrongAttemptsRef.current = 0;
		previousInputLengthRef.current = 0;
		setWrongAttempts(0);
	}, []);

	useEffect(() => {
		let isActive = true;
		setAcceptedWords([]);
		if (
			!wordRemoteId ||
			!wordLanguage ||
			!translationRemoteId ||
			!translationText ||
			!translationLanguage
		)
			return;
		(async () => {
			const synonymIds = await synonymGroupsRepository.getSynonymWordIds(
				wordRemoteId,
				wordLanguage,
			);
			const translationMatches =
				await translationsRepository.getByTranslationText(
					translationText,
					translationLanguage,
				);
			const allWordIds = [
				...new Set([...synonymIds, ...translationMatches.map((t) => t.word)]),
			];
			const ws = await wordsRepository.getByRemoteIds(allWordIds, wordLanguage);
			if (isActive) {
				setAcceptedWords(ws.map((w) => w.word));
			}
		})();
		return () => {
			isActive = false;
		};
	}, [
		wordRemoteId,
		wordLanguage,
		translationRemoteId,
		translationText,
		translationLanguage,
	]);

	const [loadKey, setLoadKey] = useState(0);

	const load = useCallback(async () => {
		setStatus("default");
		resetAttempts();
		await loadData(1, 0, 4);
	}, [loadData, resetAttempts]);

	const onExerciseComplete = useCallback(() => {
		swipeOut(() => {
			setAnswered(false);
			setStatus("default");
			resetAttempts();
			setInputResetKey((k) => k + 1);
			setLoadKey((k) => k + 1);
		});
	}, [resetAttempts, swipeOut]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: loadKey is a re-trigger counter, not used inside the effect body
	useEffect(() => {
		load();
	}, [load, loadKey]);

	useEffect(() => {
		addCompleteListener(onExerciseComplete);
		return () => removeCompleteListener(onExerciseComplete);
	}, [addCompleteListener, removeCompleteListener, onExerciseComplete]);

	useEffect(() => {
		if (word && translation) {
			notifyContentChanged();
		}
	}, [word, translation, notifyContentChanged]);

	const evaluateStatus = useCallback(
		(text: string): CharInputStatus => {
			if (!word) return "default";
			const primaryAnswer = word.word.trim().toLowerCase();
			const normalizedInput = text.trim().toLowerCase();
			const answers = [
				...new Set([
					primaryAnswer,
					...acceptedWords.map((w) => w.trim().toLowerCase()),
				]),
			].filter((w) => w.length === primaryAnswer.length);

			if (normalizedInput.length === primaryAnswer.length) {
				return answers.some((a) => a === normalizedInput) ? "success" : "error";
			}
			return answers.some((a) => a.startsWith(normalizedInput))
				? "default"
				: "error";
		},
		[word, acceptedWords],
	);

	const handleChange = useCallback(
		(text: string) => {
			if (!word || !translation || answered) return;

			const nextStatus = evaluateStatus(text);
			const currentInputLength = text.trim().length;
			const addedCharacters = Math.max(
				0,
				currentInputLength - previousInputLengthRef.current,
			);
			previousInputLengthRef.current = currentInputLength;
			setStatus(nextStatus);

			if (nextStatus === "success") {
				setAnswered(true);
				triggerLike();
				onSuccess?.(word.remoteId, score, false);
				complete();
			} else if (nextStatus === "error" && addedCharacters > 0) {
				const nextWrongAttempts = Math.min(
					maxWrongAttempts,
					wrongAttemptsRef.current + addedCharacters,
				);
				wrongAttemptsRef.current = nextWrongAttempts;
				setWrongAttempts(nextWrongAttempts);

				if (nextWrongAttempts >= maxWrongAttempts) {
					setAnswered(true);
					onFailure?.(word.remoteId, score);
					return;
				}
			}
		},
		[
			word,
			translation,
			answered,
			complete,
			triggerLike,
			evaluateStatus,
			maxWrongAttempts,
			onFailure,
			onSuccess,
		],
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
		<View style={styles.wrapper}>
			<Animated.View style={[styles.content, { transform: [{ translateX }] }]}>
				<TrainingPromptCard
					word={translation.translation}
					wordId={word.remoteId}
					onSkip={handleSkip}
				/>
			</Animated.View>

			<WCharInput
				key={`${word.remoteId}-${inputResetKey}`}
				length={word.word.length}
				onChangeText={handleChange}
				status={status}
				animateIn
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
				word={modalPair?.word}
				translation={modalPair?.translation}
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
