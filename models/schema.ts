import { appSchema, tableSchema } from "@nozbe/watermelondb";

export const schema = appSchema({
	version: 1,
	tables: [
		tableSchema({
			name: "categories",
			columns: [{ name: "title", type: "string" }],
		}),
		tableSchema({
			name: "words",
			columns: [
				{ name: "word", type: "string" },
				{ name: "language", type: "string" },
				{ name: "category", type: "string", isIndexed: true },
			],
		}),
		tableSchema({
			name: "translations",
			columns: [
				{ name: "translation", type: "string" },
				{ name: "word_id", type: "string", isIndexed: true },
				{ name: "language", type: "string" },
			],
		}),
		tableSchema({
			name: "users",
			columns: [
				{ name: "name", type: "string" },
				{ name: "email", type: "string", isIndexed: true },
			],
		}),
		tableSchema({
			name: "user_settings",
			columns: [
				{ name: "user_id", type: "string", isIndexed: true },
				{ name: "setting_key", type: "string" },
				{ name: "setting_value", type: "string" },
			],
		}),
		tableSchema({
			name: "learning_progress",
			columns: [
				{ name: "user_id", type: "string", isIndexed: true },
				{ name: "word_id", type: "string", isIndexed: true },
				{ name: "score", type: "number" },
				{ name: "last_reviewed", type: "number" },
			],
		}),
	],
});
