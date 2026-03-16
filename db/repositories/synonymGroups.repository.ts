import { Q } from "@nozbe/watermelondb";
import database from "../database";
import WordSynonymGroup from "../models/WordSynonymGroup";

export const synonymGroupsRepository = {
	/**
	 * Returns all word remoteIds that are in the same synonym group as the given wordId.
	 * Includes the wordId itself. Returns [wordId] if no group found.
	 */
	async getSynonymWordIds(wordRemoteId: number, language: string): Promise<number[]> {
		const groups = await database
			.get<WordSynonymGroup>("word_synonym_groups")
			.query(Q.where("language", language))
			.fetch();

		for (const group of groups) {
			const ids = group.wordIds;
			if (ids.includes(wordRemoteId)) {
				return ids;
			}
		}

		return [wordRemoteId];
	},
};
