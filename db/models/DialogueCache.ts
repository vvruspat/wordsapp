import { Model } from "@nozbe/watermelondb";
import { field } from "@nozbe/watermelondb/decorators";

export default class DialogueCache extends Model {
	static table = "dialogue_cache";

	@field("session_id")
	sessionId!: string;

	@field("user_id")
	userId!: number;

	@field("status")
	status!: string;

	@field("title")
	title!: string;

	@field("updated_at")
	updatedAt!: number;

	@field("payload")
	payload!: string;

	@field("draft")
	draft!: string;
}
