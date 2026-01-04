import { Model } from "@nozbe/watermelondb";
import { field } from "@nozbe/watermelondb/decorators";

export default class Topic extends Model {
	static table = "topics";

	@field("remote_id")
	remoteId!: number;

	@field("remote_created_at")
	remoteCreatedAt!: string;

	@field("title")
	title!: string;

	@field("description")
	description!: string;

	@field("language")
	language!: string;

	@field("image")
	image?: string | null;
}
