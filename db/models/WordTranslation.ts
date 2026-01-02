import { Model } from "@nozbe/watermelondb";
import { field } from "@nozbe/watermelondb/decorators";

export default class WordTranslation extends Model {
	static table = "word_translations";

	@field("remote_id")
	remoteId!: number;

	@field("remote_created_at")
	remoteCreatedAt!: string;

	@field("word")
	word!: number;

	@field("translation")
	translation!: string;

	@field("language")
	language!: string;
}
