import LearningProgress from "@/models/LearningProgress";
import { Q } from "@nozbe/watermelondb";
import { useDatabase } from "@nozbe/watermelondb/hooks";
import { Word, WordTranslation } from "@repo/types";
import { useCallback } from "react";
import { useSessionUser } from "./useSession";

const mockWords: Word[] = [
	{
		id: 2,
		created_at: "2024-01-01T00:00:00Z",
		topic: 1,
		catalog: 1,
		word: "Hallo",
		language: "nl",
		audio: "hallo.mp3",
		transcribtion: "ˈɦɑlo",
		meaning: "Hello",
	},
	{
		id: 3,
		created_at: "2024-01-01T00:00:00Z",
		topic: 1,
		catalog: 1,
		word: "Dankjewel",
		language: "nl",
		audio: "dankjewel.mp3",
		transcribtion: "dɑŋk.jə.ˈʋɛl",
		meaning: "Thank you",
	},
	{
		id: 4,
		created_at: "2024-01-01T00:00:00Z",
		topic: 2,
		catalog: 1,
		word: "Alstublieft",
		language: "nl",
		audio: "alstublieft.mp3",
		transcribtion: "ˌɑl.sty.ˈblift",
		meaning: "Please",
	},
	{
		id: 5,
		created_at: "2024-01-01T00:00:00Z",
		topic: 2,
		catalog: 1,
		word: "Tot ziens",
		language: "nl",
		audio: "tot_ziens.mp3",
		transcribtion: "tɔt ˈzins",
		meaning: "Goodbye",
	},
	{
		id: 6,
		created_at: "2024-01-01T00:00:00Z",
		topic: 3,
		catalog: 1,
		word: "Slaap lekker",
		language: "nl",
		audio: "slaap_lekker.mp3",
		transcribtion: "slaːp ˈlɛkər",
		meaning: "Sleep well",
	},
	{
		id: 7,
		created_at: "2024-01-01T00:00:00Z",
		topic: 3,
		catalog: 1,
		word: "Eet smakelijk",
		language: "nl",
		audio: "eet_smakelijk.mp3",
		transcribtion: "eːt ˈsmaːkələk",
		meaning: "Enjoy your meal",
	},
];

const mockTranslations: WordTranslation[] = [
	{
		id: 2,
		created_at: "2024-01-01T00:00:00Z",
		word: 2,
		translation: "Hello",
		language: "en",
	},
	{
		id: 3,
		created_at: "2024-01-01T00:00:00Z",
		word: 3,
		translation: "Thank you",
		language: "en",
	},
	{
		id: 4,
		created_at: "2024-01-01T00:00:00Z",
		word: 4,
		translation: "Please / Here you go",
		language: "en",
	},
	{
		id: 5,
		created_at: "2024-01-01T00:00:00Z",
		word: 5,
		translation: "Goodbye",
		language: "en",
	},
	{
		id: 6,
		created_at: "2024-01-01T00:00:00Z",
		word: 6,
		translation: "Sleep well",
		language: "en",
	},
	{
		id: 7,
		created_at: "2024-01-01T00:00:00Z",
		word: 7,
		translation: "Enjoy your meal",
		language: "en",
	},
];

type Excercise = {
	getWord: () => Word;
	getWords: (count: number) => Word[];
	getTranslation: (wordId: number) => WordTranslation;
	getRandomWords: (
		count: number,
		catalog?: Word["catalog"],
		topic?: Word["topic"],
	) => Word[];
	getRandomTranslations: (
		count: number,
		catalog?: Word["catalog"],
		topic?: Word["topic"],
	) => WordTranslation[];
	onSuccess: (wordId: Word["id"]) => void;
	onFailure: (wordId: Word["id"]) => void;
};

export const useExercise = (): Excercise => {
	const database = useDatabase();
	const session = useSessionUser();

	const getWord = useCallback(
		(): Word => mockWords[Math.floor(Math.random() * mockWords.length)],
		[],
	);

	const getWords = useCallback(
		(count: number): Word[] => mockWords.slice(0, count),
		[],
	);

	const getTranslation = useCallback(
		(wordId: Word["id"]): WordTranslation =>
			mockTranslations.find((t) => t.word === wordId)!,
		[],
	);

	const onSuccess = useCallback((wordId: Word["id"]) => {
		console.log("Exercise succeeded");
	}, []);

	const onFailure = useCallback(
		async (wordId: Word["id"], excerciseWeight = 0.1) => {
			if (session?.user) {
				const result = database
					.get<LearningProgress>("learning_progress")
					.query(
						Q.where("word_id", wordId),
						Q.where("user_id", session.user.userId),
					);

				const progressData = (await result.fetch())[0];

				await database.write(async () => {
					const progress = await database
						.get("learning_progress")
						.find(progressData.id);
					await progress.update(() => {
						progressData.score = Math.max(
							0,
							progressData.score - excerciseWeight,
						);
					});
				});
			}
		},
		[session, database],
	);

	const getRandomWords = useCallback(
		(
			count: number,
			catalog?: Word["catalog"],
			topic?: Word["topic"],
		): Word[] => {
			return mockWords.slice(0, count);
		},
		[],
	);

	const getRandomTranslations = useCallback(
		(
			count: number,
			catalog?: Word["catalog"],
			topic?: Word["topic"],
		): WordTranslation[] => {
			return mockTranslations.slice(0, count);
		},
		[],
	);

	return {
		getWord,
		getWords,
		getTranslation,
		getRandomWords,
		getRandomTranslations,
		onSuccess,
		onFailure,
	};
};
