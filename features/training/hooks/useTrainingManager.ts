import { useEffect, useMemo, useRef } from "react";
import { useStore } from "zustand";
import { useSelectionStore } from "@/shared/selection/selectionStore";
import { useSessionUser } from "@/shared/session/useSession";
import { createTrainingController } from "../services/trainingController";
import { useTrainingSelection } from "@/features/training/model/trainingSelection";
import type { TrainingConditions } from "../services/trainingService";
export function useTrainingManager(mode: "mixed" | "single") {
	const { user } = useSessionUser();
	const catalogs = useSelectionStore((state) => state.currentCatalogs);
	const topics = useSelectionStore((state) => state.currentTopics);
	const wordIds = useTrainingSelection((state) => state.chunkWordIds);
	const key = JSON.stringify({
		userId: user?.userId,
		learningLanguage: user?.language_learn ?? "en",
		nativeLanguage: user?.language_speak ?? "en",
		catalogs,
		topics,
		mode,
		wordIds: mode === "mixed" ? wordIds : null,
	});
	const current = useRef<ReturnType<typeof createTrainingController> | null>(
		null,
	);
	const controller = useMemo(() => {
		const instance = createTrainingController(
			JSON.parse(key) as TrainingConditions,
			() => current.current === instance,
		);
		return instance;
	}, [key]);
	current.current = controller;
	const state = useStore(controller.store);
	useEffect(() => {
		void controller.hydrate();
		return controller.dispose;
	}, [controller]);
	const step = state.session?.currentStep;
	return {
		currentTrainingId: state.currentTrainingId,
		setCurrentTrainingId: controller.setCurrentTrainingId,
		queueReady: state.ready,
		loadData: controller.loadData,
		getIncompleteTrainingIds: controller.getIncompleteTrainingIds,
		sessionStats: state.sessionStats,
		status: state.status,
		error: state.error,
		retry: controller.retry,
		startReview: controller.startReview,
		wordsPool: state.wordsPool,
		record: (wordId: number, score: number, result: "success" | "failure") =>
			controller.record(state.epoch, step ?? null, wordId, score, result),
	};
}
