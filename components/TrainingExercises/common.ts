import { Word } from "@vvruspat/words-types";

export type ExerciseProps = {
	onFinish?: () => void;
	onSuccess?: (wordId: Word["id"]) => void;
	onFailure?: (wordId: Word["id"]) => void;
};
