import { Model } from "@nozbe/watermelondb";
import { field } from "@nozbe/watermelondb/decorators";

export default class Word extends Model {
	static table = "words";

	@field("remote_id")
	remoteId!: number;

	@field("remote_created_at")
	remoteCreatedAt!: string;

	@field("topic")
	topic!: number;

	@field("word")
	word!: string;

	@field("catalog")
	catalog!: number;

	@field("language")
	language!: string;

	@field("audio")
	audio!: string;

	@field("transcribtion")
	transcribtion!: string;

	@field("meaning")
	meaning?: string;
}
