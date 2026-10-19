// Persisted exercise identifiers. Presentation metadata belongs to the catalog UI.
export const TRAINING_IDS = [
	"cards",
	"true_or_false",
	"match_words",
	"choose_translation",
	"type_word",
	"listening_practice",
] as const;
export type LearningTrainingName = (typeof TRAINING_IDS)[number];
export type ExerciseId = LearningTrainingName | "intro" | "type_translation";
