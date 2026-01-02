import { MatchWordCard } from "@/components/MatchWordCard/MatchWordCard";
import { ExerciseContext } from "@/context/ExerciseContext";
import Word from "@/db/models/Word";
import WordTranslation from "@/db/models/WordTranslation";
import { useExcerciseStore } from "@/hooks/useExcerciseStore";
import { shuffleArray } from "@/utils";
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { View } from "react-native";

export type MatchWordPair = {
	word: Word;
	translation?: WordTranslation;
};

export function MatchWordsExercise() {
	console.log("MatchWordsExercise");

	const [burnedPairs, setBurnedPairs] = useState<MatchWordPair[]>([]);
	const [failedWords, setFailedWords] = useState<Set<Word["remoteId"]>>(
		new Set(),
	);

	const [selectedWord, setSelectedWord] = useState<Word | null>(null);
	const [selectedTranslation, setSelectedTranslation] =
		useState<WordTranslation | null>(null);

	const {
		addCompleteListener,
		removeCompleteListener,
		loadData,
		onFailure,
		onSuccess,
		complete,
	} = useContext(ExerciseContext);
	const { currentPairs: pairs } = useExcerciseStore();
	const shuffledPairs = useMemo(() => shuffleArray(pairs), [pairs]);

	const load = useCallback(async () => {
		await loadData(4, 0, 4);
	}, [loadData]);

	const onExerciseComplete = useCallback(async () => {
		await load();
	}, [load]);

	useEffect(() => {
		load();
	}, [load]);

	useEffect(() => {
		addCompleteListener(onExerciseComplete);
		return () => removeCompleteListener(onExerciseComplete);
	}, [addCompleteListener, removeCompleteListener, onExerciseComplete]);

	const onMatch = useCallback(
		(pair: MatchWordPair) => {
			setBurnedPairs((prev) => {
				if (prev.some((item) => item.word === pair.word)) {
					return prev;
				}

				const next = [...prev, pair];

				if (!failedWords.has(pair.word.remoteId)) {
					onSuccess?.(pair.word.remoteId, 0.1, false);
				}

				console.log("onFinish", prev, prev.length + 1, pairs.length);

				if (prev.length + 1 === pairs.length) {
					console.log("onFinish called");
					setFailedWords(new Set());
					complete();

					return [];
				}

				return next;
			});
		},
		[onSuccess, complete, pairs, failedWords],
	);

	const resetSelections = useCallback(() => {
		setSelectedWord(null);
		setSelectedTranslation(null);
	}, []);

	const handleTranslationPress = useCallback(
		(translation: WordTranslation) => {
			if (
				burnedPairs.some(
					(pair) => pair.translation?.remoteId === translation.remoteId,
				)
			) {
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
					new Set(prev).add(selectedWord.remoteId).add(translation.word),
				);
				const wrongWordPair = pairs.find(
					(p) => p.word.remoteId === selectedWord.remoteId,
				);
				const wrongTranslationPair = pairs.find(
					(p) => p.translation?.remoteId === translation.remoteId,
				);
				if (wrongWordPair) {
					onFailure(selectedWord.remoteId, 0.1, false);
				}
				if (wrongTranslationPair) {
					onFailure(translation.word, 0.1, false);
				}
				setSelectedTranslation(null);
			}
		},
		[burnedPairs, selectedWord, pairs, onMatch, onFailure, resetSelections],
	);

	const handleWordPress = useCallback(
		(word: Word) => {
			if (burnedPairs.some((pair) => pair.word.remoteId === word.remoteId)) {
				return;
			}

			if (!selectedTranslation) {
				setSelectedWord((prev) =>
					prev?.remoteId === word.remoteId ? null : word,
				);
				return;
			}

			const pair = pairs.find((item) => item.word === word);

			if (pair && pair.translation === selectedTranslation) {
				onMatch(pair);
				resetSelections();
			} else {
				setFailedWords((prev) =>
					new Set(prev).add(word.remoteId).add(selectedTranslation.word),
				);
				const wrongWordPair = pairs.find(
					(p) => p.word.remoteId === word.remoteId,
				);
				const wrongTranslationPair = pairs.find(
					(p) => p.translation?.remoteId === selectedTranslation.remoteId,
				);
				if (wrongWordPair) {
					onFailure(word.remoteId, 0.1, false);
				}
				if (wrongTranslationPair) {
					onFailure(selectedTranslation.word, 0.1, false);
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
						key={pair.word.remoteId}
						onPress={() => handleWordPress(pair.word)}
						state={
							burnedPairs.some(
								(burenedPair) =>
									burenedPair.word.remoteId === pair.word.remoteId,
							)
								? "correct"
								: selectedWord?.remoteId === pair.word.remoteId
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
						key={pair.translation?.remoteId}
						text={pair.translation?.translation ?? ""}
						onPress={() =>
							pair.translation && handleTranslationPress(pair.translation)
						}
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
