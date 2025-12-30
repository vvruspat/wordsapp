import { Model } from "@nozbe/watermelondb";
import { field } from "@nozbe/watermelondb/decorators";

export default class VocabCatalog extends Model {
	static table = "vocab_catalogs";

	@field("remote_id")
	remoteId!: number;

	@field("remote_created_at")
	remoteCreatedAt!: string;

	@field("owner")
	owner!: number;

	@field("title")
	title!: string;

	@field("description")
	description?: string | null;

	@field("language")
	language!: string;

	@field("image")
	image?: string | null;
}

