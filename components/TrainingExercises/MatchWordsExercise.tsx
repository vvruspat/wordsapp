import { MatchWordCard } from "@/components/MatchWordCard/MatchWordCard";
import { useExercise } from "@/hooks/useExercise";
import { shuffleArray } from "@/utils";
import { Word, WordTranslation } from "@repo/types";
import { useCallback, useMemo, useState } from "react";
import { View } from "react-native";
import { ExerciseProps } from "./common";

export type MatchWordPair = {
	word: Word;
	translation: WordTranslation;
};

export function MatchWordsExercise({ onFinish }: ExerciseProps) {
	const [selectedTranslation, setSelectedTranslation] =
		useState<WordTranslation | null>(null);
	const [selectedWord, setSelectedWord] = useState<Word | null>(null);

	const [burnedPairs, setBurnedPairs] = useState<MatchWordPair[]>([]);
	const [failedWords, setFailedWords] = useState<Set<Word["id"]>>(new Set());

	const { onFailure, onSuccess, getWords, getTranslation } = useExercise();

	const pairs = useMemo(() => {
		const words = getWords(4);

		const pairs: MatchWordPair[] = words.map((word) => {
			const translation = getTranslation(word.id);

			return { word: word, translation: translation };
		});

		return pairs;
	}, [getWords, getTranslation]);

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
					onSuccess?.(pair.word.id);
				}

				if (prev.length + 1 === pairs.length) {
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
				onFailure(selectedWord.id);
				onFailure(translation.word);
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
				onFailure(word.id);
				onFailure(selectedTranslation.word);
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
