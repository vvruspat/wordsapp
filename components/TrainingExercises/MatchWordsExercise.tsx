import { MatchWordCard } from "@/components/MatchWordCard/MatchWordCard";
import { useExercise } from "@/hooks/useExercise";
import { useSessionUser } from "@/hooks/useSession";
import { shuffleArray } from "@/utils";
import { Word, WordTranslation } from "@repo/types";
import { useCallback, useEffect, useMemo, useState } from "react";
import { View } from "react-native";

export type MatchWordPair = {
	word: Word;
	translation: WordTranslation;
};

export function MatchWordsExercise() {
	console.log("MatchWordsExercise");
	const { user } = useSessionUser();
	const [selectedTranslation, setSelectedTranslation] =
		useState<WordTranslation | null>(null);
	const [selectedWord, setSelectedWord] = useState<Word | null>(null);

	const [burnedPairs, setBurnedPairs] = useState<MatchWordPair[]>([]);
	const [failedWords, setFailedWords] = useState<Set<Word["id"]>>(new Set());

	const { onFailure, onSuccess, onFinish, getWords, getTranslation } =
		useExercise();

	const [pairs, setPairs] = useState<MatchWordPair[]>([]);

	useEffect(() => {
		// Wait for user to be loaded before attempting to load exercise data
		if (!user?.language_learn) {
			return;
		}

		const loadPairs = async (retryCount = 0): Promise<void> => {
			const MAX_RETRIES = 5;

			try {
				const words = await getWords(4);
				const loadedPairs: MatchWordPair[] = await Promise.all(
					words.map(async (word) => {
						const translation = await getTranslation(word.id);
						return { word, translation };
					}),
				);
				setPairs(loadedPairs);
			} catch (error) {
				console.error("Failed to load exercise data:", error);
				if (
					error instanceof Error &&
					error.message.includes("No translation found") &&
					retryCount < MAX_RETRIES
				) {
					// Retry with new words if translation is missing
					console.log(
						`Retrying with new words (attempt ${retryCount + 1}/${MAX_RETRIES})`,
					);
					return loadPairs(retryCount + 1);
				}
				// If max retries reached or different error, log and stop
				console.error("Failed to load exercise data after retries:", error);
			}
		};

		loadPairs();
	}, [user, getWords, getTranslation]);

	const shuffledPairs = useMemo(() => {
		return shuffleArray(pairs);
	}, [pairs]);

	const onMatch = useCallback(
		(pair: MatchWordPair) => {
			setBurnedPairs((prev) => {
				if (prev.some((item) => item.word === pair.word)) {
					return prev;
				}

				const next = [...prev, pair];

				if (!failedWords.has(pair.word.id)) {
					onSuccess?.(pair.word.id, 0.1, false, pair.word, pair.translation);
				}

				console.log("onFinish", prev.length + 1, pairs.length);

				if (prev.length + 1 === pairs.length) {
					console.log("onFinish called");
					onFinish?.();
				}

				return next;
			});
		},
		[onSuccess, onFinish, pairs, failedWords],
	);

	const resetSelections = useCallback(() => {
		setSelectedWord(null);
		setSelectedTranslation(null);
	}, []);

	const handleTranslationPress = useCallback(
		(translation: WordTranslation) => {
			if (burnedPairs.some((pair) => pair.translation.id === translation.id)) {
				return;
			}

			if (!selectedWord) {
				setSelectedTranslation((prev) =>
					prev === translation ? null : translation,
				);
				return;
			}

			const pair = pairs.find((item) => item.translation === translation);

			if (pair && pair.word === selectedWord) {
				onMatch(pair);
				resetSelections();
			} else {
				// if choosen wrong pair, mark both word and translation as failed
				setFailedWords((prev) =>
					new Set(prev).add(selectedWord.id).add(translation.word),
				);
				const wrongWordPair = pairs.find((p) => p.word.id === selectedWord.id);
				const wrongTranslationPair = pairs.find(
					(p) => p.translation.id === translation.id,
				);
				if (wrongWordPair) {
					onFailure(
						selectedWord.id,
						0.1,
						false,
						wrongWordPair.word,
						wrongWordPair.translation,
					);
				}
				if (wrongTranslationPair) {
					onFailure(
						translation.word,
						0.1,
						false,
						wrongTranslationPair.word,
						wrongTranslationPair.translation,
					);
				}
				setSelectedTranslation(null);
			}
		},
		[burnedPairs, selectedWord, pairs, onMatch, onFailure, resetSelections],
	);

	const handleWordPress = useCallback(
		(word: Word) => {
			if (burnedPairs.some((pair) => pair.word.id === word.id)) {
				return;
			}

			if (!selectedTranslation) {
				setSelectedWord((prev) => (prev?.id === word.id ? null : word));
				return;
			}

			const pair = pairs.find((item) => item.word === word);

			if (pair && pair.translation === selectedTranslation) {
				onMatch(pair);
				resetSelections();
			} else {
				setFailedWords((prev) =>
					new Set(prev).add(word.id).add(selectedTranslation.word),
				);
				const wrongWordPair = pairs.find((p) => p.word.id === word.id);
				const wrongTranslationPair = pairs.find(
					(p) => p.translation.id === selectedTranslation.id,
				);
				if (wrongWordPair) {
					onFailure(
						word.id,
						0.1,
						false,
						wrongWordPair.word,
						wrongWordPair.translation,
					);
				}
				if (wrongTranslationPair) {
					onFailure(
						selectedTranslation.word,
						0.1,
						false,
						wrongTranslationPair.word,
						wrongTranslationPair.translation,
					);
				}
				setSelectedWord(null);
			}
		},
		[
			burnedPairs,
			selectedTranslation,
			pairs,
			onMatch,
			onFailure,
			resetSelections,
		],
	);

	if (pairs.length === 0) {
		return null; // or a loading spinner
	}

	return (
		<View
			style={{
				flex: 1,
				flexDirection: "row",
				gap: 16,
				justifyContent: "space-between",
				marginTop: 32,
			}}
		>
			<View style={{ flex: 1, gap: 16 }}>
				{pairs.map((pair) => (
					<MatchWordCard
						key={pair.word.id}
						onPress={() => handleWordPress(pair.word)}
						state={
							burnedPairs.some(
								(burenedPair) => burenedPair.word.id === pair.word.id,
							)
								? "correct"
								: selectedWord?.id === pair.word.id
									? "selected"
									: "default"
						}
						text={pair.word.word}
					/>
				))}
			</View>

			<View style={{ flex: 1, gap: 16 }}>
				{shuffledPairs.map((pair) => (
					<MatchWordCard
						key={pair.translation.id}
						text={pair.translation.translation}
						onPress={() => handleTranslationPress(pair.translation)}
						state={
							burnedPairs.some(
								(burnedPair) => burnedPair.translation === pair.translation,
							)
								? "correct"
								: selectedTranslation === pair.translation
									? "selected"
									: "default"
						}
					/>
				))}
			</View>
		</View>
	);
}
