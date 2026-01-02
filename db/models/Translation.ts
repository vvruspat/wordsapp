import { Model } from "@nozbe/watermelondb";
import { field } from "@nozbe/watermelondb/decorators";

export default class Translation extends Model {
	static table = "translations";

	@field("translation")
	translation!: string;

	@field("word_id")
	wordId!: string;

	@field("language")
	language!: string;
}
