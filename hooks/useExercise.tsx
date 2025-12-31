import type {
	LearningCatalogItem,
	LearningTrainingName,
} from "@/components/LearningCatalog/types";
import { useLearningTrainings } from "@/components/LearningCatalog/useLearningTrainings";
import {
	WordExcerciseFailureModal,
	WordExcerciseSuccessModal,
} from "@/components/Modals/WordExcerciseResult";
import { ExerciseFinishContext } from "@/context/ExerciseFinishContext";
import { ResultModalContext } from "@/context/ResultModalContext";
import LearningProgress from "@/models/LearningProgress";
import Word from "@/models/Word";
import WordTranslation from "@/models/WordTranslation";
import { Q } from "@nozbe/watermelondb";
import { useDatabase } from "@nozbe/watermelondb/hooks";
import {
	Language,
	Word as WordDto,
	WordTranslation as WordTranslationDto,
} from "@repo/types";
import {
	ReactElement,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
} from "react";
import { View } from "react-native";
import { useExcerciseStore } from "./useExcerciseStore";
import { useSessionUser } from "./useSession";

type Excercise = {
	onFinish: () => void;
	getWord: () => Promise<WordDto>;
	getWords: (count: number) => Promise<WordDto[]>;
	getTranslation: (wordId: number) => Promise<WordTranslationDto>;
	getRandomWords: (
		count: number,
		catalog?: WordDto["catalog"],
		topic?: WordDto["topic"],
		exclude?: WordDto[],
	) => Promise<WordDto[]>;
	getRandomTranslations: (
		count: number,
		catalog?: WordDto["catalog"],
		topic?: WordDto["topic"],
		exclude?: WordTranslationDto[],
	) => Promise<WordTranslationDto[]>;
	onSuccess: (
		wordId: WordDto["id"],
		excerciseWeight?: number,
		showModal?: boolean,
		word?: WordDto,
		translation?: WordTranslationDto,
	) => void;
	onFailure: (
		wordId: WordDto["id"],
		excerciseWeight?: number,
		showModal?: boolean,
		word?: WordDto,
		translation?: WordTranslationDto,
	) => void;
	resultModals: () => ReactElement;
	currentTraining: LearningCatalogItem | null;
};

// Helper function to convert Word model to WordDto
const wordToDto = (word: Word): WordDto => ({
	status: "processed",
	id: word.remoteId,
	created_at: word.remoteCreatedAt,
	topic: word.topic,
	word: word.word,
	catalog: word.catalog,
	language: word.language as Language,
	audio: word.audio,
	transcribtion: word.transcribtion,
	meaning: word.meaning,
});

// Helper function to convert WordTranslation model to WordTranslationDto
const translationToDto = (
	translation: WordTranslation,
): WordTranslationDto => ({
	id: translation.remoteId,
	created_at: translation.remoteCreatedAt,
	word: translation.word,
	translation: translation.translation,
	language: translation.language,
});

export const useExercise = (trainingName?: LearningTrainingName): Excercise => {
	const database = useDatabase();
	const session = useSessionUser();
	const {
		setCurrentWord,
		setCurrentTranslation,
		currentCatalog,
		currentTopic,
	} = useExcerciseStore();

	const trainings = useLearningTrainings();
	const trainingsRef = useRef(trainings);

	// Keep ref in sync with trainings, but don't cause rerenders
	useEffect(() => {
		trainingsRef.current = trainings;
	}, [trainings]);

	const {
		successModalVisible,
		failureModalVisible,
		setSuccessModalVisible,
		setFailureModalVisible,
	} = useContext(ResultModalContext);

	const { triggerFinish } = useContext(ExerciseFinishContext);

	const [currentTraining, setCurrentTraining] =
		useState<LearningCatalogItem | null>(null);

	const getWord = useCallback(async (): Promise<WordDto> => {
		if (!session?.user?.language_learn) {
			throw new Error("User language_learn is not set");
		}

		const queryConditions = [Q.where("language", session.user.language_learn)];

		// Only add catalog filter if it's not null or undefined
		if (currentCatalog != null) {
			queryConditions.push(Q.where("catalog", currentCatalog));
		}

		// Only add topic filter if it's not null or undefined
		if (currentTopic != null) {
			queryConditions.push(Q.where("topic", currentTopic));
		}

		const words = await database
			.get<Word>("words")
			.query(...queryConditions)
			.fetch();

		if (words.length === 0) {
			throw new Error("No words found matching the current filters");
		}

		const randomWord = words[Math.floor(Math.random() * words.length)];
		const wordDto = wordToDto(randomWord);
		setCurrentWord(wordDto);
		return wordDto;
	}, [database, session, currentCatalog, currentTopic, setCurrentWord]);

	const getWords = useCallback(
		async (count: number): Promise<WordDto[]> => {
			if (!session?.user?.language_learn) {
				throw new Error("User language_learn is not set");
			}

			const queryConditions = [
				Q.where("language", session.user.language_learn),
			];

			// Only add catalog filter if it's not null or undefined
			if (currentCatalog != null) {
				queryConditions.push(Q.where("catalog", currentCatalog));
			}

			// Only add topic filter if it's not null or undefined
			if (currentTopic != null) {
				queryConditions.push(Q.where("topic", currentTopic));
			}

			const words = await database
				.get<Word>("words")
				.query(...queryConditions)
				.fetch();

			return words.slice(0, count).map(wordToDto);
		},
		[database, session, currentCatalog, currentTopic],
	);

	const getTranslation = useCallback(
		async (wordId: WordDto["id"]): Promise<WordTranslationDto> => {
			if (!session?.user?.language_speak) {
				throw new Error("User language_speak is not set");
			}

			const translations = await database
				.get<WordTranslation>("word_translations")
				.query(
					Q.where("word", wordId),
					Q.where("language", session.user.language_speak),
				)
				.fetch();

			if (translations.length === 0) {
				throw new Error(`No translation found for word ${wordId}`);
			}

			const translation = translations[0];
			const translationDto = translationToDto(translation);
			setCurrentTranslation(translationDto);
			return translationDto;
		},
		[database, session, setCurrentTranslation],
	);

	const onSuccess = useCallback(
		async (
			wordId: WordDto["id"],
			excerciseWeight = 0.1,
			showModal = false,
			word?: WordDto,
			translation?: WordTranslationDto,
		) => {
			// Update store with word and translation before showing modal
			if (word) {
				setCurrentWord(word);
			}
			if (translation) {
				setCurrentTranslation(translation);
			}

			setSuccessModalVisible(showModal);

			if (session?.user) {
				const result = await database
					.get<LearningProgress>("learning_progress")
					.query(
						Q.where("word_id", String(wordId)),
						Q.where("user_id", String(session.user.userId)),
					)
					.fetch();

				await database.write(async () => {
					if (result.length > 0) {
						const progress = await database
							.get<LearningProgress>("learning_progress")
							.find(result[0].id);
						const currentScore = progress.score;
						await progress.update((p) => {
							p.score = Math.max(0, currentScore + excerciseWeight);
							p.lastReviewed = Date.now();
						});
					} else {
						// Create new learning progress entry
						await database
							.get<LearningProgress>("learning_progress")
							.create((p) => {
								if (session.user) {
									p.userId = session.user.userId;
									p.wordId = wordId;
									p.score = excerciseWeight;
									p.lastReviewed = Date.now();
								}
							});
					}
				});
			}
		},
		[
			session,
			database,
			setSuccessModalVisible,
			setCurrentWord,
			setCurrentTranslation,
		],
	);

	const onFailure = useCallback(
		async (
			wordId: WordDto["id"],
			excerciseWeight = 0.1,
			showModal = false,
			word?: WordDto,
			translation?: WordTranslationDto,
		) => {
			// Update store with word and translation before showing modal
			if (word) {
				setCurrentWord(word);
			}
			if (translation) {
				setCurrentTranslation(translation);
			}

			setFailureModalVisible(showModal);

			if (session?.user) {
				const result = await database
					.get<LearningProgress>("learning_progress")
					.query(
						Q.where("word_id", String(wordId)),
						Q.where("user_id", String(session.user.userId)),
					)
					.fetch();

				await database.write(async () => {
					if (result.length > 0) {
						const progress = await database
							.get<LearningProgress>("learning_progress")
							.find(result[0].id);
						const currentScore = progress.score;
						await progress.update((p) => {
							p.score = Math.max(0, currentScore - excerciseWeight);
							p.lastReviewed = Date.now();
						});
					} else {
						// Create new learning progress entry with negative score
						await database
							.get<LearningProgress>("learning_progress")
							.create((p) => {
								if (session.user) {
									p.userId = session.user.userId;
									p.wordId = wordId;
									p.score = Math.max(0, -excerciseWeight);
									p.lastReviewed = Date.now();
								}
							});
					}
				});
			}
		},
		[
			session,
			database,
			setFailureModalVisible,
			setCurrentWord,
			setCurrentTranslation,
		],
	);

	const getRandomWord = useCallback(
		async (
			exclude: WordDto[] = [],
			catalog?: WordDto["catalog"],
			topic?: WordDto["topic"],
		): Promise<WordDto> => {
			if (!session?.user?.language_learn) {
				throw new Error("User language_learn is not set");
			}

			const queryConditions = [
				Q.where("language", session.user.language_learn),
			];

			// Use provided catalog/topic or fall back to current store values
			const filterCatalog = catalog ?? currentCatalog;
			const filterTopic = topic ?? currentTopic;

			// Only add filters if they're not null or undefined
			if (filterCatalog != null) {
				queryConditions.push(Q.where("catalog", filterCatalog));
			}

			if (filterTopic != null) {
				queryConditions.push(Q.where("topic", filterTopic));
			}

			const words = await database
				.get<Word>("words")
				.query(...queryConditions)
				.fetch();

			if (words.length === 0) {
				throw new Error("No words found matching the filters");
			}

			const excludeIds = new Set(exclude.map((w) => w.id));
			const availableWords = words.filter((w) => !excludeIds.has(w.remoteId));

			if (availableWords.length === 0) {
				throw new Error("No words available after excluding specified words");
			}

			const randomWord =
				availableWords[Math.floor(Math.random() * availableWords.length)];
			return wordToDto(randomWord);
		},
		[database, session, currentCatalog, currentTopic],
	);

	const getRandomTranslation = useCallback(
		async (
			exclude: WordTranslationDto[] = [],
			catalog?: WordDto["catalog"],
			topic?: WordDto["topic"],
		): Promise<WordTranslationDto> => {
			if (!session?.user?.language_speak) {
				throw new Error("User language_speak is not set");
			}

			// First, get words matching catalog/topic filters
			const queryConditions = [
				Q.where("language", session.user.language_learn || ""),
			];

			const filterCatalog = catalog ?? currentCatalog;
			const filterTopic = topic ?? currentTopic;

			// Only add filters if they're not null or undefined
			if (filterCatalog != null) {
				queryConditions.push(Q.where("catalog", filterCatalog));
			}

			if (filterTopic != null) {
				queryConditions.push(Q.where("topic", filterTopic));
			}

			const words = await database
				.get<Word>("words")
				.query(...queryConditions)
				.fetch();

			if (words.length === 0) {
				throw new Error("No words found matching the filters");
			}

			const wordIds = words.map((w) => w.remoteId);
			const excludeIds = new Set(exclude.map((t) => t.id));

			const translations = await database
				.get<WordTranslation>("word_translations")
				.query(
					Q.where("word", Q.oneOf(wordIds)),
					Q.where("language", session.user.language_speak),
				)
				.fetch();

			const availableTranslations = translations.filter(
				(t) => !excludeIds.has(t.remoteId),
			);

			if (availableTranslations.length === 0) {
				throw new Error(
					"No translations available after excluding specified translations",
				);
			}

			const randomTranslation =
				availableTranslations[
					Math.floor(Math.random() * availableTranslations.length)
				];
			return translationToDto(randomTranslation);
		},
		[database, session, currentCatalog, currentTopic],
	);

	const getRandomWords = useCallback(
		async (
			count: number,
			catalog?: WordDto["catalog"],
			topic?: WordDto["topic"],
			exclude: WordDto[] = [],
		): Promise<WordDto[]> => {
			const words: WordDto[] = [];
			const currentExclude = [...exclude];

			for (let i = 0; i < count; i++) {
				try {
					const word = await getRandomWord(currentExclude, catalog, topic);
					words.push(word);
					currentExclude.push(word);
				} catch {
					// If we can't get more words, break
					break;
				}
			}

			return words;
		},
		[getRandomWord],
	);

	const getRandomTranslations = useCallback(
		async (
			count: number,
			catalog?: WordDto["catalog"],
			topic?: WordDto["topic"],
			exclude: WordTranslationDto[] = [],
		): Promise<WordTranslationDto[]> => {
			const translations: WordTranslationDto[] = [];
			const currentExclude = [...exclude];

			for (let i = 0; i < count; i++) {
				try {
					const translation = await getRandomTranslation(
						currentExclude,
						catalog,
						topic,
					);
					translations.push(translation);
					currentExclude.push(translation);
				} catch {
					// If we can't get more translations, break
					break;
				}
			}

			return translations;
		},
		[getRandomTranslation],
	);

	const getNextTraining =
		useCallback(async (): Promise<LearningCatalogItem | null> => {
			const currentTrainings = trainingsRef.current;
			// Note: components show as undefined in console.log because React components
			// cannot be serialized to JSON, but they exist at runtime
			if (!session?.user?.language_learn) {
				return currentTrainings[
					Math.floor(Math.random() * currentTrainings.length)
				];
			}

			// Check if there are words available for the current filters
			const queryConditions = [
				Q.where("language", session.user.language_learn),
			];

			// Only add filters if they're not null or undefined
			if (currentCatalog != null) {
				queryConditions.push(Q.where("catalog", currentCatalog));
			}

			if (currentTopic != null) {
				queryConditions.push(Q.where("topic", currentTopic));
			}

			const words = await database
				.get<Word>("words")
				.query(...queryConditions)
				.fetch();

			// If no words available, return null or a random training
			if (words.length === 0) {
				return currentTrainings[
					Math.floor(Math.random() * currentTrainings.length)
				];
			}

			// Select a random word from available words
			const randomWord = words[Math.floor(Math.random() * words.length)];
			const wordDto = wordToDto(randomWord);
			setCurrentWord(wordDto);

			// Return a random training (this might need adjustment based on requirements)
			return currentTrainings[
				Math.floor(Math.random() * currentTrainings.length)
			];
		}, [database, session, currentCatalog, currentTopic, setCurrentWord]);

	const onFinish = useCallback(() => {
		if (!trainingName) {
			// For mix training, switch to a new random training
			// Don't trigger finish callback since we're switching to a different component
			getNextTraining().then((training) => {
				setCurrentTraining(training);
			});
		} else {
			// For specific training, reload the current exercise
			triggerFinish();
		}
	}, [getNextTraining, trainingName, triggerFinish]);

	const onSuccessModalClose = useCallback(() => {
		setSuccessModalVisible(false);
		onFinish();
	}, [setSuccessModalVisible, onFinish]);

	const onFailureModalClose = useCallback(() => {
		setFailureModalVisible(false);
		onFinish();
	}, [setFailureModalVisible, onFinish]);

	const resultModals = () => (
		<View>
			<WordExcerciseSuccessModal
				visible={successModalVisible}
				onRequestClose={onSuccessModalClose}
			/>
			<WordExcerciseFailureModal
				visible={failureModalVisible}
				onRequestClose={onFailureModalClose}
			/>
		</View>
	);

	// Store getNextTraining in a ref to avoid useEffect dependency issues
	const getNextTrainingRef = useRef(getNextTraining);
	useEffect(() => {
		getNextTrainingRef.current = getNextTraining;
	}, [getNextTraining]);

	// Initialize currentTraining on mount only
	useEffect(() => {
		getNextTrainingRef.current().then((training) => {
			setCurrentTraining(training);
		});
	}, []); // Only run on mount

	return {
		getWord,
		getWords,
		getTranslation,
		getRandomWords,
		getRandomTranslations,
		onSuccess,
		onFailure,
		onFinish,
		resultModals,
		currentTraining,
	};
};
