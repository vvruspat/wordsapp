import { createContext } from "react";
import type { Word } from "@vvruspat/words-types";
import type { LearningTrainingName } from "@/shared/progress/exercises";
export type ExerciseType = {
	wordsPool: {
		currentPairs: import("@/shared/vocabulary/wordsService").WordPair[];
		currentRandomWords: import("@/db/models/Word").default[];
		currentRandomTranslations: import("@/db/models/WordTranslation").default[];
	};
	startReview?: () => void;
	status?: "loading" | "ready" | "empty" | "completed" | "error";
	error?: unknown;
	retry?: () => Promise<void>;
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
	setCurrentTrainingId: (trainingId: string | null) => void;
	currentTrainingId: string | null;
	queueReady: boolean;
	getIncompleteTrainingIds: (
		trainingIds: LearningTrainingName[],
	) => Promise<LearningTrainingName[]>;
	triggerLike: () => void;
	sessionStats: {
		successCount: number;
		failureCount: number;
		totalCount: number;
		successEventCount: number;
	};
};

const ExerciseContext = createContext<ExerciseType>({
	wordsPool: {
		currentPairs: [],
		currentRandomWords: [],
		currentRandomTranslations: [],
	},
	showSuccessModal: () => {},
	showFailureModal: () => {},
	addCompleteListener: () => {},
	removeCompleteListener: () => {},
	complete: () => {},
	loadData: async () => {},
	onFailure: () => {},
	onSuccess: () => {},
	setCurrentTrainingId: () => {},
	currentTrainingId: null,
	queueReady: false,
	getIncompleteTrainingIds: async (trainingIds) => trainingIds,
	triggerLike: () => {},
	sessionStats: {
		successCount: 0,
		failureCount: 0,
		totalCount: 0,
		successEventCount: 0,
	},
});

export { ExerciseContext };
