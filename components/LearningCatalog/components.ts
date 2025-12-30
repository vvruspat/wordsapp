import {
  ChooseTranslationExercise,
  ListeningPracticeExercise,
  MatchWordsExercise,
  TrueOrFalseExercise,
  TypeTranslationExercise,
} from "../TrainingExercises";

export const trainingComponents = {
  true_or_false: TrueOrFalseExercise,
  choose_translation: ChooseTranslationExercise,
  type_translation: TypeTranslationExercise,
  match_words: MatchWordsExercise,
  listening_practice: ListeningPracticeExercise,
} as const;
