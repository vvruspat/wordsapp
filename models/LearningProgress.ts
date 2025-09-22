import { Model } from "@nozbe/watermelondb";
import { field } from "@nozbe/watermelondb/decorators";

export default class LearningProgress extends Model {
	static table = "learning_progress";

	@field("user_id")
	userId!: string;

	@field("word_id")
	wordId!: string;

	@field("score")
	score!: number;

	@field("last_reviewed")
	lastReviewed!: number;
}
