import { Colors } from "@/mob-ui/brand/colors";

export const EXERCISES_APPS = {
	true_or_false: {
		id: "true_or_false",
		titleColor: Colors.dark.black,
		titleId: "app_true_or_false_title",
		backgroundColor: Colors.backgrounds.purple,
		descriptionColor: Colors.dark.dark1,
		descriptionId: "app_true_or_false_description",
	},
	choose_translation: {
		id: "choose_translation",
		titleColor: Colors.dark.black,
		titleId: "app_choose_translation_title",
		backgroundColor: Colors.backgrounds.cyan,
		descriptionColor: Colors.dark.dark1,
		descriptionId: "app_choose_translation_description",
	},
	type_translation: {
		id: "type_translation",
		titleColor: Colors.dark.black,
		titleId: "app_type_translation_title",
		backgroundColor: Colors.backgrounds.blue,
		descriptionColor: Colors.dark.dark1,
		descriptionId: "app_type_translation_description",
	},
	match_words: {
		id: "match_words",
		titleColor: Colors.dark.black,
		titleId: "app_match_words_title",
		backgroundColor: Colors.backgrounds.orange,
		descriptionColor: Colors.dark.dark1,
		descriptionId: "app_match_words_description",
	},
	listening_practice: {
		id: "listening_practice",
		titleColor: Colors.dark.black,
		titleId: "app_listening_practice_title",
		backgroundColor: Colors.backgrounds.yellow,
		descriptionColor: Colors.dark.dark1,
		descriptionId: "app_listening_practice_description",
	},
} as const;

export type LearningTrainingName = keyof typeof EXERCISES_APPS;

export default EXERCISES_APPS;
