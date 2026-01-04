import { Q } from "@nozbe/watermelondb";
import { VocabCatalog as VocabCatalogRemote } from "@repo/types";
import database from "../database";
import VocabCatalog from "../models/VocabCatalog";

const vocabCatalogs = database.collections.get<VocabCatalog>("vocab_catalogs");

export const vocabcatalogRepository = {
	async create(catalogData: Partial<VocabCatalogRemote>) {
		await database.write(async () => {
			await vocabCatalogs.create((catalog) => {
				if (catalogData.id) {
					catalog.remoteId = catalogData.id;
				}
				if (catalogData.created_at) {
					catalog.remoteCreatedAt = catalogData.created_at;
				}
				if (catalogData.owner) {
					catalog.owner = catalogData.owner;
				}
				if (catalogData.title) {
					catalog.title = catalogData.title;
				}
				if (catalogData.description !== undefined) {
					catalog.description = catalogData.description;
				}
				if (catalogData.language) {
					catalog.language = catalogData.language;
				}
				if (catalogData.image !== undefined) {
					catalog.image = catalogData.image;
				}

				return catalog;
			});
		});
	},

	async update(catalogData: Partial<VocabCatalog>) {
		if (!catalogData.id) {
			throw new Error("VocabCatalog id is required for update.");
		}
		await database.write(async () => {
			const catalog = await vocabCatalogs.find(catalogData.id as string);
			if (!catalog) {
				throw new Error(`VocabCatalog with id ${catalogData.id} not found.`);
			}
			await catalog.update((c) => {
				if (catalogData.owner !== undefined) c.owner = catalogData.owner;
				if (catalogData.title !== undefined) c.title = catalogData.title;
				if (catalogData.description !== undefined)
					c.description = catalogData.description;
				if (catalogData.language !== undefined)
					c.language = catalogData.language;
				if (catalogData.image !== undefined) c.image = catalogData.image;
			});
		});
	},

	async delete(id: string) {
		await database.write(async () => {
			const catalog = await vocabCatalogs.find(id);
			if (catalog) {
				await catalog.markAsDeleted();
			}
		});
		return vocabCatalogs.query().observe();
	},

	async getByRemoteId(remoteId: number): Promise<VocabCatalog | null> {
		const results = await database
			.get<VocabCatalog>("vocab_catalogs")
			.query(Q.where("remote_id", remoteId))
			.fetch();

		return results[0] || null;
	},

	async getByOwner(owner: number): Promise<VocabCatalog[]> {
		const results = await database
			.get<VocabCatalog>("vocab_catalogs")
			.query(Q.where("owner", owner))
			.fetch();

		return results;
	},

	async getByLanguage(language: string): Promise<VocabCatalog[]> {
		const results = await database
			.get<VocabCatalog>("vocab_catalogs")
			.query(Q.where("language", language))
			.fetch();

		return results;
	},

	async getByOwnerAndLanguage(
		owner: number,
		language: string,
	): Promise<VocabCatalog[]> {
		const results = await database
			.get<VocabCatalog>("vocab_catalogs")
			.query(Q.where("owner", owner), Q.where("language", language))
			.fetch();

		return results;
	},

	getAll(): Promise<VocabCatalog[]> {
		return database.get<VocabCatalog>("vocab_catalogs").query().fetch();
	},
};
