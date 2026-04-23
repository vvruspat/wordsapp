import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, useWindowDimensions, View } from "react-native";
import { MatchWordCard } from "@/components/MatchWordCard/MatchWordCard";
import { ExerciseContext } from "@/context/ExerciseContext";
import Word from "@/db/models/Word";
import WordTranslation from "@/db/models/WordTranslation";
import { useExcerciseStore } from "@/hooks/useExcerciseStore";
import { shuffleArray } from "@/utils";
import { logger } from "@/utils/logger";

const ITEM_COUNT = 4;
const OUT_DURATION = 200;
const IN_DURATION = 180;
const ROW_STAGGER = 60;

export type MatchWordPair = {
	word: Word;
	translation?: WordTranslation;
};

export function MatchWordsExercise() {
	const [burnedPairs, setBurnedPairs] = useState<MatchWordPair[]>([]);
	const [failedWords, setFailedWords] = useState<Set<Word["remoteId"]>>(new Set());
	const [selectedWord, setSelectedWord] = useState<Word | null>(null);
	const [selectedTranslation, setSelectedTranslation] = useState<WordTranslation | null>(null);
	const [flashingWordIds, setFlashingWordIds] = useState<Set<number>>(new Set());
	const [flashingTranslationIds, setFlashingTranslationIds] = useState<Set<number>>(new Set());
	const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const flashWrong = useCallback((wordId: number, translationRemoteId: number) => {
		clearTimeout(flashTimeoutRef.current);
		setFlashingWordIds(new Set([wordId]));
		setFlashingTranslationIds(new Set([translationRemoteId]));
		flashTimeoutRef.current = setTimeout(() => {
			setFlashingWordIds(new Set());
			setFlashingTranslationIds(new Set());
		}, 400);
	}, []);

	const { width } = useWindowDimensions();
	// Left column: slides from left (-width), right column: from right (+width)
	const leftAnims = useRef(
		Array.from({ length: ITEM_COUNT }, () => new Animated.Value(0)),
	).current;
	const rightAnims = useRef(
		Array.from({ length: ITEM_COUNT }, () => new Animated.Value(0)),
	).current;
	const waitingForContent = useRef(false);

	const swipeOut = useCallback(
		(afterSwipeOut: () => void) => {
			Animated.parallel([
				...leftAnims.map((a) =>
					Animated.timing(a, {
						toValue: -width,
						duration: OUT_DURATION,
						useNativeDriver: true,
						easing: Easing.in(Easing.ease),
					}),
				),
				...rightAnims.map((a) =>
					Animated.timing(a, {
						toValue: width,
						duration: OUT_DURATION,
						useNativeDriver: true,
						easing: Easing.in(Easing.ease),
					}),
				),
			]).start(() => {
				for (const a of leftAnims) a.setValue(-width);
				for (const a of rightAnims) a.setValue(width);
				waitingForContent.current = true;
				afterSwipeOut();
			});
		},
		[leftAnims, rightAnims, width],
	);

	const notifyContentChanged = useCallback(() => {
		if (!waitingForContent.current) return;
		waitingForContent.current = false;

		// Each row (left[i] + right[i]) slides in together, rows cascade one by one
		Animated.stagger(
			ROW_STAGGER,
			Array.from({ length: ITEM_COUNT }, (_, i) =>
				Animated.parallel([
					Animated.timing(leftAnims[i], {
						toValue: 0,
						duration: IN_DURATION,
						useNativeDriver: true,
						easing: Easing.out(Easing.ease),
					}),
					Animated.timing(rightAnims[i], {
						toValue: 0,
						duration: IN_DURATION,
						useNativeDriver: true,
						easing: Easing.out(Easing.ease),
					}),
				]),
			),
		).start();
	}, [leftAnims, rightAnims]);

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

	const onExerciseComplete = useCallback(() => {
		swipeOut(() => {
			load();
		});
	}, [swipeOut, load]);

	useEffect(() => {
		load();
	}, [load]);

	useEffect(() => {
		addCompleteListener(onExerciseComplete);
		return () => removeCompleteListener(onExerciseComplete);
	}, [addCompleteListener, removeCompleteListener, onExerciseComplete]);

	useEffect(() => {
		if (pairs.length > 0) {
			notifyContentChanged();
		}
	}, [pairs, notifyContentChanged]);

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

				logger.debug("onMatch", { prevLength: prev.length + 1, pairsLength: pairs.length }, "ui");

				if (prev.length + 1 === pairs.length) {
					logger.debug("onFinish called", undefined, "ui");
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
			if (burnedPairs.some((pair) => pair.translation?.remoteId === translation.remoteId)) {
				return;
			}

			if (!selectedWord) {
				setSelectedTranslation((prev) => (prev === translation ? null : translation));
				return;
			}

			const pair = pairs.find((item) => item.translation === translation);

			if (pair && pair.word === selectedWord) {
				onMatch(pair);
				resetSelections();
			} else {
				setFailedWords((prev) =>
					new Set(prev).add(selectedWord.remoteId).add(translation.word),
				);
				flashWrong(selectedWord.remoteId, translation.remoteId);
				const wrongWordPair = pairs.find((p) => p.word.remoteId === selectedWord.remoteId);
				const wrongTranslationPair = pairs.find(
					(p) => p.translation?.remoteId === translation.remoteId,
				);
				if (wrongWordPair) onFailure(selectedWord.remoteId, 0.1, false);
				if (wrongTranslationPair) onFailure(translation.word, 0.1, false);
				setSelectedTranslation(null);
			}
		},
		[burnedPairs, selectedWord, pairs, onMatch, onFailure, resetSelections, flashWrong],
	);

	const handleWordPress = useCallback(
		(word: Word) => {
			if (burnedPairs.some((pair) => pair.word.remoteId === word.remoteId)) {
				return;
			}

			if (!selectedTranslation) {
				setSelectedWord((prev) => (prev?.remoteId === word.remoteId ? null : word));
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
				flashWrong(word.remoteId, selectedTranslation.remoteId);
				const wrongWordPair = pairs.find((p) => p.word.remoteId === word.remoteId);
				const wrongTranslationPair = pairs.find(
					(p) => p.translation?.remoteId === selectedTranslation.remoteId,
				);
				if (wrongWordPair) onFailure(word.remoteId, 0.1, false);
				if (wrongTranslationPair) onFailure(selectedTranslation.word, 0.1, false);
				setSelectedWord(null);
			}
		},
		[burnedPairs, selectedTranslation, pairs, onMatch, onFailure, resetSelections, flashWrong],
	);

	if (pairs.length === 0) {
		return null;
	}

	return (
		<View style={styles.wrapper}>
			<View style={styles.grid}>
				<View style={styles.column}>
					{pairs.map((pair, i) => (
						<Animated.View
							key={pair.word.remoteId}
							style={[
								styles.cardWrapper,
								leftAnims[i] ? { transform: [{ translateX: leftAnims[i] }] } : undefined,
							]}
						>
							<MatchWordCard
								onPress={() => handleWordPress(pair.word)}
								state={
									burnedPairs.some((bp) => bp.word.remoteId === pair.word.remoteId)
										? "correct"
										: flashingWordIds.has(pair.word.remoteId)
											? "incorrect"
											: selectedWord?.remoteId === pair.word.remoteId
												? "selected"
												: "default"
								}
								text={pair.word.word}
							/>
						</Animated.View>
					))}
				</View>

				<View style={styles.column}>
					{shuffledPairs.map((pair, i) => (
						<Animated.View
							key={pair.translation?.remoteId}
							style={[
								styles.cardWrapper,
								rightAnims[i] ? { transform: [{ translateX: rightAnims[i] }] } : undefined,
							]}
						>
							<MatchWordCard
								text={pair.translation?.translation ?? ""}
								onPress={() => pair.translation && handleTranslationPress(pair.translation)}
								state={
									burnedPairs.some((bp) => bp.translation === pair.translation)
										? "correct"
										: pair.translation && flashingTranslationIds.has(pair.translation.remoteId)
											? "incorrect"
											: selectedTranslation === pair.translation
												? "selected"
												: "default"
								}
							/>
						</Animated.View>
					))}
				</View>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	wrapper: {
		flex: 1,
		width: "100%",
		overflow: "hidden",
	},
	grid: {
		flex: 1,
		flexDirection: "row",
		gap: 16,
		justifyContent: "space-between",
		marginTop: 32,
	},
	column: {
		flex: 1,
		gap: 16,
	},
	cardWrapper: {
		flex: 1,
	},
});
