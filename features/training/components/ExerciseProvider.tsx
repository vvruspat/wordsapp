import { type ReactNode, useCallback, useRef, useState } from "react";
import { FloatingLike } from "@/components/FloatingLike";
import {
	WordExcerciseFailureModal,
	WordExcerciseSuccessModal,
} from "@/features/training/components/WordExcerciseResult";
import { ExerciseContext, type ExerciseType } from "@/shared/training/events";
import { useTrainingManager } from "@/features/training/hooks/useTrainingManager";
import { logger } from "@/utils/logger";
export { ExerciseContext } from "@/shared/training/events";
export type Exercise = "success" | "failure";
export const ExerciseProvider = ({
	children,
	mode = "single",
}: {
	children?: ReactNode;
	mode?: "mixed" | "single";
}) => {
	const manager = useTrainingManager(mode);
	const [modalVisible, setModalVisible] = useState<Exercise | null>(null);
	const [modalPair, setModalPair] = useState<{
		word: string;
		translation: string;
		wordId: number;
	} | null>(null);
	const [likeTrigger, setLikeTrigger] = useState(0);
	const listeners = useRef(new Set<() => void>());
	const addCompleteListener = useCallback((listener: () => void) => {
		listeners.current.add(listener);
	}, []);
	const removeCompleteListener = useCallback((listener: () => void) => {
		listeners.current.delete(listener);
	}, []);
	const onRequestClose = useCallback(() => {
		setModalVisible(null);
		for (const listener of listeners.current) {
			try {
				listener();
			} catch (error) {
				logger.error("Completion listener failed", error, "general");
			}
		}
	}, []);
	const feedback = (
		result: Exercise,
		wordId: number,
		score: number,
		showModal = true,
	) => {
		const pair = manager.wordsPool.currentPairs.find(
			(item) => item.word.remoteId === wordId,
		);
		void manager.record(wordId, score, result);
		if (showModal) {
			setModalPair({
				word: pair?.word.word ?? "",
				translation: pair?.translation?.translation ?? "",
				wordId,
			});
			setModalVisible(result);
		}
	};
	const value: ExerciseType = {
		...manager,
		addCompleteListener,
		removeCompleteListener,
		complete: onRequestClose,
		onSuccess: (id, score, show) => feedback("success", id, score, show),
		onFailure: (id, score, show) => feedback("failure", id, score, show),
		showSuccessModal: () => setModalVisible("success"),
		showFailureModal: () => setModalVisible("failure"),
		triggerLike: () => setLikeTrigger((n) => n + 1),
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
					wordId={modalPair?.wordId}
					onRequestClose={onRequestClose}
				/>
			)}
			<FloatingLike trigger={likeTrigger} />
		</ExerciseContext.Provider>
	);
};
