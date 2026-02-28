import {
	addColumns,
	createTable,
	schemaMigrations,
} from "@nozbe/watermelondb/Schema/migrations";

export default schemaMigrations({
	migrations: [
		{
			toVersion: 3,
			steps: [
				addColumns({
					table: "learning_progress",
					columns: [
						{
							name: "remote_id",
							type: "number",
							isIndexed: true,
							isOptional: true,
						},
						{ name: "last_review", type: "string" },
						{ name: "created_at_remote", type: "string" },
						{ name: "training", type: "number", isOptional: true },
						{ name: "translation", type: "number", isOptional: true },
					],
				}),
			],
		},
		{
			toVersion: 2,
			steps: [
				// Create new tables
				createTable({
					name: "word_translations",
					columns: [
						{ name: "remote_id", type: "number", isIndexed: true },
						{ name: "remote_created_at", type: "string" },
						{ name: "word", type: "number", isIndexed: true },
						{ name: "translation", type: "string" },
						{ name: "language", type: "string", isIndexed: true },
					],
				}),
				createTable({
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
				createTable({
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
				// Update words table
				addColumns({
					table: "words",
					columns: [
						{ name: "remote_id", type: "number", isIndexed: true },
						{ name: "remote_created_at", type: "string" },
						{ name: "topic", type: "number", isIndexed: true },
						{ name: "catalog", type: "number", isIndexed: true },
						{ name: "audio", type: "string" },
						{ name: "transcribtion", type: "string" },
						{ name: "meaning", type: "string", isOptional: true },
					],
				}),
				// Update users table
				addColumns({
					table: "users",
					columns: [
						{ name: "user_id", type: "number", isIndexed: true },
						{ name: "remote_created_at", type: "string" },
						{ name: "language_speak", type: "string" },
						{ name: "language_learn", type: "string", isOptional: true },
						{ name: "email_verified", type: "boolean", isOptional: true },
					],
				}),
			],
		},
	],
});
