import { Model } from "@nozbe/watermelondb";
import { field } from "@nozbe/watermelondb/decorators";

export default class Word extends Model {
	static table = "words";

	@field("word")
	word!: string;

	@field("language")
	language!: string;

	@field("category")
	category!: string;
}
