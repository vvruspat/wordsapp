import { Database } from "@nozbe/watermelondb";
import SQLiteAdapter from "@nozbe/watermelondb/adapters/sqlite";
import migrations from "./migrations/migrations";
import Category from "./models/Category";
import LearningProgress from "./models/LearningProgress";
import Topic from "./models/Topic";
import Translation from "./models/Translation";
import User from "./models/User";
import UserSetting from "./models/UserSetting";
import VocabCatalog from "./models/VocabCatalog";
import Word from "./models/Word";
import WordTranslation from "./models/WordTranslation";
import { schema } from "./schema/schema";

// Component that handles vocabulary sync - must be inside DatabaseProvider
const adapter = new SQLiteAdapter({
	schema,
	migrations,
	jsi: false,
	dbName: "wordsapp",
	// (optional, but you should implement this method)
	onSetUpError: (_error) => {
		// Database failed to load -- offer the user to reload the app or log out
	},
});

// Then, make a Watermelon database from it!
const database = new Database({
	adapter,
	modelClasses: [
		User,
		UserSetting,
		Word,
		Translation,
		WordTranslation,
		VocabCatalog,
		Topic,
		LearningProgress,
		Category,
	],
});

export default database;
