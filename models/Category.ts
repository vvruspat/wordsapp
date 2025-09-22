import { Model } from "@nozbe/watermelondb";
import { field } from "@nozbe/watermelondb/decorators";

export default class Category extends Model {
	static table = "categories";

	@field("title")
	title!: string;
}
