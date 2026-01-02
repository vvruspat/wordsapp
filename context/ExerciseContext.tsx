import {
	WordExcerciseFailureModal,
	WordExcerciseSuccessModal,
} from "@/components/Modals/WordExcerciseResult";
import { translationsRepository } from "@/db/repositories/translations.repository";
import { wordsRepository } from "@/db/repositories/words.repository";
import { useExcerciseStore } from "@/hooks/useExcerciseStore";
import { useSessionUser } from "@/hooks/useSession";
import { Word } from "@repo/types";
import { createContext, ReactNode, useCallback, useRef, useState } from "react";

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
});

export { ExerciseContext };
type ExerciseProviderProps = { children?: ReactNode };

type ExerciseValue = ExerciseType;

export type Exercise = "success" | "failure";

export const ExerciseProvider = ({ children }: ExerciseProviderProps) => {
	const [modalVisible, setModalVisible] = useState<Exercise | null>(null);

	const completeListeners = useRef(new Set<() => void>());

	const { user } = useSessionUser();

	const {
		currentCatalog,
		currentTopic,
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
				console.error("Error notifying complete listener:", error);
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
				currentCatalog ?? undefined,
				currentTopic ?? undefined,
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
				currentCatalog ?? undefined,
				currentTopic ?? undefined,
			);

			const randomTranslations =
				await translationsRepository.getRandomTranslations(
					user?.language_speak ?? "en",
					numberOfRandomTranslations,
					translations.map((translation) => translation.remoteId),
				);

			setCurrentRandomWords(randomWords);
			setCurrentRandomTranslations(randomTranslations);
		},
		[
			currentCatalog,
			currentTopic,
			setCurrentPairs,
			setCurrentRandomWords,
			setCurrentRandomTranslations,
			user?.language_speak,
			user?.language_learn,
		],
	);

	const onFailure = useCallback(
		(wordId: Word["id"], score: number, showModal: boolean = true) => {
			console.log("onFailure", wordId, score);
			// TODO: Update score in database
			showModal && showFailureModal();
		},
		[showFailureModal],
	);

	const onSuccess = useCallback(
		(wordId: Word["id"], score: number, showModal: boolean = true) => {
			console.log("onSuccess", wordId, score);
			// TODO: Update score in database
			showModal && showSuccessModal();
		},
		[showSuccessModal],
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
	};

	return (
		<ExerciseContext.Provider value={value}>
			{children}

			{modalVisible === "success" && (
				<WordExcerciseSuccessModal onRequestClose={onRequestClose} />
			)}
			{modalVisible === "failure" && (
				<WordExcerciseFailureModal onRequestClose={onRequestClose} />
			)}
		</ExerciseContext.Provider>
	);
};
