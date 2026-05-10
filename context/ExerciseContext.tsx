import { Word } from "@vvruspat/words-types";
import {
	createContext,
	type ReactNode,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import { FloatingLike } from "@/components/FloatingLike";
import {
	WordExcerciseFailureModal,
	WordExcerciseSuccessModal,
} from "@/components/Modals/WordExcerciseResult";
import WatermelonWord from "@/db/models/Word";
import WatermelonWordTranslation from "@/db/models/WordTranslation";
import { learningRepository } from "@/db/repositories/learning.repository";
import { translationsRepository } from "@/db/repositories/translations.repository";
import { wordsRepository } from "@/db/repositories/words.repository";
import { useExcerciseStore } from "@/hooks/useExcerciseStore";
import { useSessionUser } from "@/hooks/useSession";
import { useVocabularyStore } from "@/hooks/useVocabularyStore";
import { logger } from "@/utils/logger";

type SessionPair = {
	word: WatermelonWord;
	translation: WatermelonWordTranslation;
};

// Large number to fetch all words when initializing queues
const ALL_WORDS_COUNT = 999999;

type QueueSnapshot = {
	failed: SessionPair[];
	succeeded: SessionPair[];
};

type ExerciseType = {
	showSuccessModal: () => void;
	showFailureModal: () => void;
	addCompleteListener: (listener: () => void) => void;
	removeCompleteListener: (listener: () => void) => void;
	complete: () => void;
	loadData: (
		numberOfPairs: number,
		numberOfRandomWords: number,
		numberOfRandomTranslations: number,
	) => Promise<void>;
	onFailure: (wordId: Word["id"], score: number, showModal?: boolean) => void;
	onSuccess: (wordId: Word["id"], score: number, showModal?: boolean) => void;
	setCurrentTrainingId: (trainingId: string | null) => void;
	triggerLike: () => void;
	sessionStats: {
		successCount: number;
		failureCount: number;
		totalCount: number;
		successEventCount: number;
	};
};

const ExerciseContext = createContext<ExerciseType>({
	showSuccessModal: () => {},
	showFailureModal: () => {},
	addCompleteListener: () => {},
	removeCompleteListener: () => {},
	complete: () => {},
	loadData: async () => {},
	onFailure: () => {},
	onSuccess: () => {},
	setCurrentTrainingId: () => {},
	triggerLike: () => {},
	sessionStats: {
		successCount: 0,
		failureCount: 0,
		totalCount: 0,
		successEventCount: 0,
	},
});

export { ExerciseContext };

type ExerciseProviderProps = { children?: ReactNode };

type ExerciseValue = ExerciseType;

export type Exercise = "success" | "failure";

export const ExerciseProvider = ({ children }: ExerciseProviderProps) => {
	const [modalVisible, setModalVisible] = useState<Exercise | null>(null);
	const [modalPair, setModalPair] = useState<{
		word: string;
		translation: string;
		wordId?: number;
	} | null>(null);
	const [likeTrigger, setLikeTrigger] = useState(0);

	const triggerLike = useCallback(() => {
		setLikeTrigger((n) => n + 1);
	}, []);
	const [currentTrainingId, setCurrentTrainingIdState] = useState<
		string | null
	>(null);

	const completeListeners = useRef(new Set<() => void>());
	// Words not yet mastered (untrained + previously failed) — primary training source
	const failedQueue = useRef<SessionPair[]>([]);
	// Words previously answered correctly — reviewed occasionally for reinforcement
	const successQueue = useRef<SessionPair[]>([]);
	// Promise that resolves when queue initialization is complete
	const initializationPromise = useRef<Promise<void> | null>(null);
	const queueHydrationId = useRef(0);
	// Track last served word to avoid immediate repeats
	const lastServedWordId = useRef<number | null>(null);

	// Session progress tracking
	const [sessionSuccessCount, setSessionSuccessCount] = useState(0);
	const [sessionFailureCount, setSessionFailureCount] = useState(0);
	const [sessionTotalCount, setSessionTotalCount] = useState(0);
	const [sessionSuccessEventCount, setSessionSuccessEventCount] = useState(0);
	const succeededWordIds = useRef(new Set<number>());
	const failedWordIds = useRef(new Set<number>());

	const { user } = useSessionUser();
	const lastSyncTime = useVocabularyStore((state) => state.lastSyncTime);

	const {
		currentCatalogs,
		currentTopics,
		setCurrentPairs,
		setCurrentRandomWords,
		setCurrentRandomTranslations,
		chunkWordIds,
	} = useExcerciseStore();

	const addCompleteListener = useCallback((listener: () => void) => {
		completeListeners.current.add(listener);
	}, []);

	const removeCompleteListener = useCallback((listener: () => void) => {
		completeListeners.current.delete(listener);
	}, []);

	const notifyCompleteListeners = useCallback(() => {
		completeListeners.current.forEach((listener) => {
			try {
				listener?.();
			} catch (error) {
				logger.error("Error notifying complete listener:", error, "general");
			}
		});
	}, []);

	const showSuccessModal = useCallback(() => {
		setModalVisible("success");
	}, []);

	const showFailureModal = useCallback(() => {
		setModalVisible("failure");
	}, []);

	const hideModal = useCallback(() => {
		setModalVisible(null);
	}, []);

	const onRequestClose = useCallback(() => {
		hideModal();
		notifyCompleteListeners();
	}, [hideModal, notifyCompleteListeners]);

	const complete = useCallback(() => {
		onRequestClose();
	}, [onRequestClose]);

	// Pre-load all words into failed/success queues before training begins.
	// When trainingId is provided, progress is scoped to that exercise only.
	const initializeQueues = useCallback(
		async (trainingId?: string | null): Promise<QueueSnapshot> => {
			try {
				const allWords = await wordsRepository.getRandomWords(
					user?.language_learn ?? "en",
					ALL_WORDS_COUNT,
					[],
					currentCatalogs.length > 0 ? currentCatalogs : undefined,
					currentTopics.length > 0 ? currentTopics : undefined,
				);

				const allTranslations = await translationsRepository.getByWordIds(
					user?.language_speak ?? "en",
					allWords.map((w) => w.remoteId),
				);

				const allPairs = allWords
					.map((word) => ({
						word,
						translation: allTranslations.find((t) => t.word === word.remoteId),
					}))
					.filter((p): p is SessionPair => p.translation !== undefined);

				const pairsToUse =
					chunkWordIds != null && chunkWordIds.length > 0
						? allPairs.filter((p) => chunkWordIds.includes(p.word.remoteId))
						: allPairs;

				if (user?.userId) {
					const progressRecords =
						trainingId != null
							? await learningRepository.getByUserAndTraining(user.userId, trainingId)
							: await learningRepository.getByUser(user.userId);
					const progressByWordId = new Map(
						progressRecords.map((r) => [r.wordId, r]),
					);
					const succeededWordIds = new Set(
						progressRecords
							.filter((r) => r.score > 0 && r.training !== "intro")
							.map((r) => r.wordId),
					);

					const failed: SessionPair[] = [];
					const succeeded: SessionPair[] = [];

					for (const pair of pairsToUse) {
						if (succeededWordIds.has(pair.word.remoteId)) {
							succeeded.push(pair);
						} else {
							failed.push(pair);
						}
					}

					return {
						failed: failed.sort(() => Math.random() - 0.5),
						succeeded: succeeded.sort(
							(a, b) =>
								new Date(
									progressByWordId.get(a.word.remoteId)?.lastReview ?? 0,
								).getTime() -
								new Date(
									progressByWordId.get(b.word.remoteId)?.lastReview ?? 0,
								).getTime(),
						),
					};
				}

				return {
					failed: pairsToUse.sort(() => Math.random() - 0.5),
					succeeded: [],
				};
			} catch (error) {
				logger.error("Failed to initialize training queues:", error, "general");
				return {
					failed: [],
					succeeded: [],
				};
			}
		},
		[currentCatalogs, currentTopics, user, chunkWordIds],
	);

	const resetSessionStats = useCallback(() => {
		succeededWordIds.current = new Set();
		failedWordIds.current = new Set();
		setSessionSuccessCount(0);
		setSessionFailureCount(0);
		setSessionTotalCount(0);
		setSessionSuccessEventCount(0);
	}, []);

	const hydrateQueues = useCallback(
		(trainingId?: string | null) => {
			const hydrationId = queueHydrationId.current + 1;
			queueHydrationId.current = hydrationId;
			failedQueue.current = [];
			successQueue.current = [];
			resetSessionStats();
			const promise = initializeQueues(trainingId).then((snapshot) => {
				if (queueHydrationId.current !== hydrationId) {
					return;
				}

				failedQueue.current = snapshot.failed;
				successQueue.current = snapshot.succeeded;
				const total = failedQueue.current.length + successQueue.current.length;
				const alreadySucceeded = successQueue.current.map(
					(p) => p.word.remoteId,
				);
				succeededWordIds.current = new Set(alreadySucceeded);
				setSessionTotalCount(total);
				setSessionSuccessCount(alreadySucceeded.length);

				if (
					total > 0 &&
					useExcerciseStore.getState().currentPairs.length === 0
				) {
					notifyCompleteListeners();
				}
			});
			initializationPromise.current = promise;
			return promise;
		},
		[initializeQueues, notifyCompleteListeners, resetSessionStats],
	);

	// Re-initialize queues when language, filters, training, or synced vocabulary changes.
	// biome-ignore lint/correctness/useExhaustiveDependencies: lastSyncTime is a sync completion trigger for rebuilding exercise queues.
	useEffect(() => {
		hydrateQueues(currentTrainingId);
	}, [currentTrainingId, hydrateQueues, lastSyncTime]);

	// Clear queues and re-initialize when switching training sessions
	const setCurrentTrainingId = useCallback(
		(trainingId: string | null) => {
			logger.debug("ExerciseContext: setCurrentTrainingId", { trainingId }, "general");
			setCurrentTrainingIdState(trainingId);
			hydrateQueues(trainingId).then(() => {
				logger.debug(
					"ExerciseContext: queue initialized",
					{
						total: failedQueue.current.length + successQueue.current.length,
						succeeded: successQueue.current.length,
						trainingId,
					},
					"general",
				);
			});
		},
		[hydrateQueues],
	);

	const loadData = useCallback(
		async (
			numberOfPairs: number = 1,
			numberOfRandomWords: number = 0,
			numberOfRandomTranslations: number = 1,
		) => {
			let pairs: SessionPair[];

			if (numberOfPairs > 1) {
				// Multi-pair exercises (e.g. match words) always fetch directly from DB
				const words = await wordsRepository.getRandomWords(
					user?.language_learn ?? "en",
					numberOfPairs * 4,
					[],
					currentCatalogs.length > 0 ? currentCatalogs : undefined,
					currentTopics.length > 0 ? currentTopics : undefined,
					user?.userId,
					currentTrainingId ?? undefined,
				);
				const translations = await translationsRepository.getByWordIds(
					user?.language_speak ?? "en",
					words.map((word) => word.remoteId),
				);
				pairs = words
					.map((word) => ({
						word,
						translation: translations.find((t) => t.word === word.remoteId),
					}))
					.filter((p): p is SessionPair => p.translation !== undefined)
					.slice(0, numberOfPairs);
			} else {
				// Wait for queue initialization to complete before serving
				if (initializationPromise.current) {
					await initializationPromise.current;
				}

				// Review already-successful words only after the unfinished queue is exhausted.
				const useSuccessQueue = failedQueue.current.length === 0;

				let item: SessionPair | undefined;
				if (useSuccessQueue) {
					// Shift out — onSuccess/onFailure will re-insert into the correct queue
					item = successQueue.current.shift();
				}

				if (!item) {
					item = failedQueue.current.shift();
				}

				// Avoid showing the same word twice in a row when an alternative exists
				if (item && item.word.remoteId === lastServedWordId.current) {
					const alt =
						failedQueue.current.shift() ?? successQueue.current.shift();
					if (alt) {
						failedQueue.current.push(item);
						item = alt;
					}
				}

				lastServedWordId.current = item?.word.remoteId ?? null;

				if (!item) {
					const fallbackWords = await wordsRepository.getRandomWords(
						user?.language_learn ?? "en",
						1,
						[],
						currentCatalogs.length > 0 ? currentCatalogs : undefined,
						currentTopics.length > 0 ? currentTopics : undefined,
						user?.userId,
						currentTrainingId ?? undefined,
					);
					const fallbackTranslations = await translationsRepository.getByWordIds(
						user?.language_speak ?? "en",
						fallbackWords.map((word) => word.remoteId),
					);
					item = fallbackWords
						.map((word) => ({
							word,
							translation: fallbackTranslations.find(
								(t) => t.word === word.remoteId,
							),
						}))
						.find((pair): pair is SessionPair => pair.translation !== undefined);
				}

				pairs = item ? [item] : [];
			}

			setCurrentPairs(pairs);

			const randomWords = await wordsRepository.getRandomWords(
				user?.language_learn ?? "en",
				numberOfRandomWords,
				pairs.map((p) => p.word.remoteId),
				currentCatalogs.length > 0 ? currentCatalogs : undefined,
				currentTopics.length > 0 ? currentTopics : undefined,
			);

			const randomTranslations =
				await translationsRepository.getRandomTranslations(
					user?.language_speak ?? "en",
					numberOfRandomTranslations,
					pairs.map((p) => p.translation.remoteId),
					currentTopics.length > 0 ? currentTopics : undefined,
					currentCatalogs.length > 0 ? currentCatalogs : undefined,
				);

			setCurrentRandomWords(randomWords);
			setCurrentRandomTranslations(randomTranslations);
		},
		[
			currentCatalogs,
			currentTopics,
			setCurrentPairs,
			setCurrentRandomWords,
			setCurrentRandomTranslations,
			user?.language_speak,
			user?.language_learn,
			user?.userId,
			currentTrainingId,
		],
	);

	const onFailure = useCallback(
		(wordId: Word["id"], scoreDelta: number, showModal: boolean = true) => {
			const pair = useExcerciseStore
				.getState()
				.currentPairs.find((p) => p.word.remoteId === wordId);
			const translationId = pair?.translation?.remoteId;

			// Move word to end of failed queue (remove from success queue if it was there)
			if (pair?.translation) {
				const successIdx = successQueue.current.findIndex(
					(p) => p.word.remoteId === wordId,
				);
				if (successIdx !== -1) {
					successQueue.current.splice(successIdx, 1);
				}
				failedQueue.current.push({
					word: pair.word,
					translation: pair.translation,
				});
			}

			// Track unique failed words (skip if already succeeded or already counted)
			if (
				!succeededWordIds.current.has(wordId) &&
				!failedWordIds.current.has(wordId)
			) {
				failedWordIds.current.add(wordId);
				setSessionFailureCount((c) => c + 1);
			}

			if (user?.userId) {
				learningRepository
					.recordResult({
						userId: user.userId,
						wordId,
						scoreDelta,
						result: "failure",
						translationId,
						trainingId: currentTrainingId ?? undefined,
					})
					.catch((err) => logger.error("Failed to record result", err, "db"));
			}

			if (showModal) {
				setModalPair({
					word: pair?.word.word ?? "",
					translation: pair?.translation?.translation ?? "",
					wordId,
				});
				showFailureModal();
			}
		},
		[showFailureModal, user, currentTrainingId],
	);

	const onSuccess = useCallback(
		(wordId: Word["id"], scoreDelta: number, showModal: boolean = true) => {
			const pair = useExcerciseStore
				.getState()
				.currentPairs.find((p) => p.word.remoteId === wordId);
			const translationId = pair?.translation?.remoteId;
			setSessionSuccessEventCount((c) => c + 1);

			// Remove word from failed queue and move to end of success queue
			if (pair?.translation) {
				const failedIdx = failedQueue.current.findIndex(
					(p) => p.word.remoteId === wordId,
				);
				if (failedIdx !== -1) {
					failedQueue.current.splice(failedIdx, 1);
				}
				successQueue.current.push({
					word: pair.word,
					translation: pair.translation,
				});
			}

			// Track unique succeeded words (move from failed to succeeded if needed)
			if (!succeededWordIds.current.has(wordId)) {
				succeededWordIds.current.add(wordId);
				setSessionSuccessCount((c) => c + 1);
				if (failedWordIds.current.has(wordId)) {
					failedWordIds.current.delete(wordId);
					setSessionFailureCount((c) => Math.max(0, c - 1));
				}
			}

			if (user?.userId) {
				learningRepository
					.recordResult({
						userId: user.userId,
						wordId,
						scoreDelta,
						result: "success",
						translationId,
						trainingId: currentTrainingId ?? undefined,
					})
					.catch((err) => logger.error("Failed to record result", err, "db"));
			}

			if (showModal) {
				setModalPair({
					word: pair?.word.word ?? "",
					translation: pair?.translation?.translation ?? "",
					wordId,
				});
				showSuccessModal();
			}
		},
		[showSuccessModal, user, currentTrainingId],
	);

	const value: ExerciseValue = {
		showSuccessModal,
		showFailureModal,
		complete,
		addCompleteListener,
		removeCompleteListener,
		loadData,
		onFailure,
		onSuccess,
		setCurrentTrainingId,
		triggerLike,
		sessionStats: {
			successCount: sessionSuccessCount,
			failureCount: sessionFailureCount,
			totalCount: sessionTotalCount,
			successEventCount: sessionSuccessEventCount,
		},
	};

	return (
		<ExerciseContext.Provider value={value}>
			{children}

			{modalVisible === "success" && (
				<WordExcerciseSuccessModal
					word={modalPair?.word}
					translation={modalPair?.translation}
					onRequestClose={onRequestClose}
				/>
			)}
			{modalVisible === "failure" && (
				<WordExcerciseFailureModal
					word={modalPair?.word}
					translation={modalPair?.translation}
					wordId={modalPair?.wordId}
					onRequestClose={onRequestClose}
				/>
			)}
			<FloatingLike trigger={likeTrigger} />
		</ExerciseContext.Provider>
	);
};
