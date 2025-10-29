import { Word } from "@repo/types";

export type ExerciseProps = {
	onFinish?: () => void;
	onSuccess?: (wordId: Word["id"]) => void;
	onFailure?: (wordId: Word["id"]) => void;
};
