import { Model } from "@nozbe/watermelondb";
import { field } from "@nozbe/watermelondb/decorators";

export default class LearningProgress extends Model {
	static table = "learning_progress";

	@field("remote_id")
	remoteId!: number;

	@field("user_id")
	userId!: number;

	@field("word_id")
	wordId!: number;

	@field("score")
	score!: number;

	@field("last_review")
	lastReview!: string;

	@field("created_at_remote")
	createdAtRemote!: string;

	@field("training")
	training!: number;

	@field("translation")
	translation!: number;
}
