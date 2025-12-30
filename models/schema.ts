import { appSchema, tableSchema } from "@nozbe/watermelondb";

export const schema = appSchema({
	version: 2,
	tables: [
		tableSchema({
			name: "categories",
			columns: [{ name: "title", type: "string" }],
		}),
		tableSchema({
			name: "words",
			columns: [
				{ name: "remote_id", type: "number", isIndexed: true },
				{ name: "remote_created_at", type: "string" },
				{ name: "topic", type: "number", isIndexed: true },
				{ name: "word", type: "string" },
				{ name: "catalog", type: "number", isIndexed: true },
				{ name: "language", type: "string", isIndexed: true },
				{ name: "audio", type: "string" },
				{ name: "transcribtion", type: "string" },
				{ name: "meaning", type: "string", isOptional: true },
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
			name: "word_translations",
			columns: [
				{ name: "remote_id", type: "number", isIndexed: true },
				{ name: "remote_created_at", type: "string" },
				{ name: "word", type: "number", isIndexed: true },
				{ name: "translation", type: "string" },
				{ name: "language", type: "string", isIndexed: true },
			],
		}),
		tableSchema({
			name: "vocab_catalogs",
			columns: [
				{ name: "remote_id", type: "number", isIndexed: true },
				{ name: "remote_created_at", type: "string" },
				{ name: "owner", type: "number", isIndexed: true },
				{ name: "title", type: "string" },
				{ name: "description", type: "string", isOptional: true },
				{ name: "language", type: "string", isIndexed: true },
				{ name: "image", type: "string", isOptional: true },
			],
		}),
		tableSchema({
			name: "topics",
			columns: [
				{ name: "remote_id", type: "number", isIndexed: true },
				{ name: "remote_created_at", type: "string" },
				{ name: "title", type: "string" },
				{ name: "description", type: "string" },
				{ name: "language", type: "string", isIndexed: true },
				{ name: "image", type: "string", isOptional: true },
			],
		}),
		tableSchema({
			name: "users",
			columns: [
				{ name: "user_id", type: "number", isIndexed: true },
				{ name: "name", type: "string" },
				{ name: "email", type: "string", isIndexed: true },
				{ name: "remote_created_at", type: "string" },
				{ name: "language_speak", type: "string" },
				{ name: "language_learn", type: "string", isOptional: true },
				{ name: "email_verified", type: "boolean", isOptional: true },
			],
		}),
		tableSchema({
			name: "user_profile",
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
