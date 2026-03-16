import { Model } from "@nozbe/watermelondb";
import { field } from "@nozbe/watermelondb/decorators";

export default class WordSynonymGroup extends Model {
	static table = "word_synonym_groups";

	@field("remote_id")
	remoteId!: number;

	@field("language")
	language!: string;

	// Stored as JSON string, e.g. "[101, 247]"
	@field("word_ids")
	wordIdsJson!: string;

	get wordIds(): number[] {
		try {
			return JSON.parse(this.wordIdsJson) as number[];
		} catch {
			return [];
		}
	}
}
