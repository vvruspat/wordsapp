import { Word } from "@vvruspat/words-types";
import { createContext, ReactNode, useCallback, useRef, useState } from "react";
import {
	WordExcerciseFailureModal,
	WordExcerciseSuccessModal,
} from "@/components/Modals/WordExcerciseResult";
import { learningRepository } from "@/db/repositories/learning.repository";
import { translationsRepository } from "@/db/repositories/translations.repository";
import { wordsRepository } from "@/db/repositories/words.repository";
import { useExcerciseStore } from "@/hooks/useExcerciseStore";
import { useLearningSync } from "@/hooks/useLearningSync";
import { useSessionUser } from "@/hooks/useSession";
import { logger } from "@/utils/logger";

type ExerciseType = {
	showSuccessModal: () => void;
	showFailureModal: () => void;
	addCompleteListener: (listener: () => void) => void;
	removeCompleteListener: (listener: () => void) => void;
	complete: () => void;
	loadData: (
		numberOfPairs: number,
		numberOfRandomWords: number,
		numberOfRandomTranslations: number,
	) => Promise<void>;
	onFailure: (wordId: Word["id"], score: number, showModal?: boolean) => void;
	onSuccess: (wordId: Word["id"], score: number, showModal?: boolean) => void;
	setCurrentTrainingId: (trainingId: number | null) => void;
};

const ExerciseContext = createContext<ExerciseType>({
	showSuccessModal: () => {},
	showFailureModal: () => {},
	addCompleteListener: () => {},
	removeCompleteListener: () => {},
	complete: () => {},
	loadData: async () => {},
	onFailure: () => {},
	onSuccess: () => {},
	setCurrentTrainingId: () => {},
});

export { ExerciseContext };
type ExerciseProviderProps = { children?: ReactNode };

type ExerciseValue = ExerciseType;

export type Exercise = "success" | "failure";

export const ExerciseProvider = ({ children }: ExerciseProviderProps) => {
	const [modalVisible, setModalVisible] = useState<Exercise | null>(null);
	const [modalPair, setModalPair] = useState<{
		word: string;
		translation: string;
	} | null>(null);
	const [currentTrainingId, setCurrentTrainingId] = useState<number | null>(
		null,
	);

	const completeListeners = useRef(new Set<() => void>());

	const { user } = useSessionUser();
	const { syncToBackend } = useLearningSync();

	const {
		currentCatalogs,
		currentTopics,
		setCurrentPairs,
		setCurrentRandomWords,
		setCurrentRandomTranslations,
	} = useExcerciseStore();

	const addCompleteListener = useCallback((listener: () => void) => {
		completeListeners.current.add(listener);
	}, []);

	const removeCompleteListener = useCallback((listener: () => void) => {
		completeListeners.current.delete(listener);
	}, []);

	const notifyCompleteListeners = useCallback(() => {
		completeListeners.current.forEach((listener) => {
			try {
				listener?.();
			} catch (error) {
				logger.error("Error notifying complete listener:", error, "general");
			}
		});
	}, []);

	const showSuccessModal = useCallback(() => {
		setModalVisible("success");
	}, []);

	const showFailureModal = useCallback(() => {
		setModalVisible("failure");
	}, []);

	const hideModal = useCallback(() => {
		setModalVisible(null);
	}, []);

	const onRequestClose = useCallback(() => {
		hideModal();
		notifyCompleteListeners();
	}, [hideModal, notifyCompleteListeners]);

	const complete = useCallback(() => {
		onRequestClose();
	}, [onRequestClose]);

	const loadData = useCallback(
		async (
			numberOfPairs: number = 1,
			numberOfRandomWords: number = 0,
			numberOfRandomTranslations: number = 1,
		) => {
			const words = await wordsRepository.getRandomWords(
				user?.language_learn ?? "en",
				numberOfPairs * 4, // multiply by 4 to get more words for the exercise for the case when there are no translations
				[],
				currentCatalogs.length > 0 ? currentCatalogs : undefined,
				currentTopics.length > 0 ? currentTopics : undefined,
				user?.userId,
			);
			const translations = await translationsRepository.getByWordIds(
				user?.language_speak ?? "en",
				words.map((word) => word.remoteId),
			);

			const pairs = words
				.map((word) => ({
					word,
					translation: translations.find(
						(translation) => translation.word === word.remoteId,
					),
				}))
				.filter((pair) => pair.translation !== undefined)
				.slice(0, numberOfPairs);

			setCurrentPairs(pairs);

			const randomWords = await wordsRepository.getRandomWords(
				user?.language_learn ?? "en",
				numberOfRandomWords,
				words.map((word) => word.remoteId),
				currentCatalogs.length > 0 ? currentCatalogs : undefined,
				currentTopics.length > 0 ? currentTopics : undefined,
			);

			const randomTranslations =
				await translationsRepository.getRandomTranslations(
					user?.language_speak ?? "en",
					numberOfRandomTranslations,
					translations.map((translation) => translation.remoteId),
					currentTopics.length > 0 ? currentTopics : undefined,
					currentCatalogs.length > 0 ? currentCatalogs : undefined,
				);

			setCurrentRandomWords(randomWords);
			setCurrentRandomTranslations(randomTranslations);
		},
		[
			currentCatalogs,
			currentTopics,
			setCurrentPairs,
			setCurrentRandomWords,
			setCurrentRandomTranslations,
			user?.language_speak,
			user?.language_learn,
			user?.userId,
		],
	);

	const onFailure = useCallback(
		(wordId: Word["id"], scoreDelta: number, showModal: boolean = true) => {
			const pair = useExcerciseStore
				.getState()
				.currentPairs.find((p) => p.word.remoteId === wordId);
			const translationId = pair?.translation?.remoteId;

			if (user?.userId) {
				learningRepository
					.recordResult({
						userId: user.userId,
						wordId,
						scoreDelta,
						result: "failure",
						translationId,
						trainingId: currentTrainingId ?? undefined,
					})
					.then(() => syncToBackend())
					.catch((err) => logger.error("Failed to record result", err, "db"));
			}

			if (showModal) {
				setModalPair({
					word: pair?.word.word ?? "",
					translation: pair?.translation?.translation ?? "",
				});
				showFailureModal();
			}
		},
		[showFailureModal, user, currentTrainingId, syncToBackend],
	);

	const onSuccess = useCallback(
		(wordId: Word["id"], scoreDelta: number, showModal: boolean = true) => {
			const pair = useExcerciseStore
				.getState()
				.currentPairs.find((p) => p.word.remoteId === wordId);
			const translationId = pair?.translation?.remoteId;

			if (user?.userId) {
				learningRepository
					.recordResult({
						userId: user.userId,
						wordId,
						scoreDelta,
						result: "success",
						translationId,
						trainingId: currentTrainingId ?? undefined,
					})
					.then(() => syncToBackend())
					.catch((err) => logger.error("Failed to record result", err, "db"));
			}

			if (showModal) {
				setModalPair({
					word: pair?.word.word ?? "",
					translation: pair?.translation?.translation ?? "",
				});
				showSuccessModal();
			}
		},
		[showSuccessModal, user, currentTrainingId, syncToBackend],
	);

	const value: ExerciseValue = {
		showSuccessModal,
		showFailureModal,
		complete,
		addCompleteListener,
		removeCompleteListener,
		loadData,
		onFailure,
		onSuccess,
		setCurrentTrainingId,
	};

	return (
		<ExerciseContext.Provider value={value}>
			{children}

			{modalVisible === "success" && (
				<WordExcerciseSuccessModal
					word={modalPair?.word}
					translation={modalPair?.translation}
					onRequestClose={onRequestClose}
				/>
			)}
			{modalVisible === "failure" && (
				<WordExcerciseFailureModal
					word={modalPair?.word}
					translation={modalPair?.translation}
					onRequestClose={onRequestClose}
				/>
			)}
		</ExerciseContext.Provider>
	);
};
