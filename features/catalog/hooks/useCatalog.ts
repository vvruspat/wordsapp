import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import Topic from "@/db/models/Topic";
import VocabCatalog from "@/db/models/VocabCatalog";
import Word from "@/db/models/Word";
import { learningRepository } from "@/db/repositories/learning.repository";
import { topicsRepository } from "@/db/repositories/topics.repository";
import { userSettingsRepository } from "@/db/repositories/userSettings.repository";
import { vocabcatalogRepository } from "@/db/repositories/vocabcatalog.repository";
import { wordsRepository } from "@/db/repositories/words.repository";
import { useExcerciseStore } from "@/hooks/useExcerciseStore";
import { useSessionUser } from "@/hooks/useSession";
import { useVocabularyStore } from "@/hooks/useVocabularyStore";
import { logger } from "@/utils/logger";
import { buildTopicProgressStats } from "@/utils/topicProgress";

export function useCatalog() {
	const { t } = useTranslation();

	const {
		currentCatalogs,
		currentTopics,
		setCurrentCatalogs,
		setCurrentTopics,
		_hasHydrated,
		topicsInitialized,
		setTopicsInitialized,
	} = useExcerciseStore();
	const { user } = useSessionUser();

	const [catalogs, setCatalogs] = useState<VocabCatalog[]>([]);
	const [topics, setTopics] = useState<Topic[]>([]);
	const [topicTranslations, setTopicTranslations] = useState<
		Map<number, string>
	>(new Map());

	const filterTopics = useCallback(async (): Promise<Topic[]> => {
		if (currentCatalogs.length === 0) {
			return [];
		}
		const wordsTopics =
			await wordsRepository.getTopicsByCatalogs(currentCatalogs);
		return topics.filter((topic) => wordsTopics.has(topic.remoteId));
	}, [topics, currentCatalogs]);

	const [filteredTopics, setFilteredTopics] = useState<Topic[]>([]);
	const [topicWords, setTopicWords] = useState<Word[]>([]);
	const [topicStats, setTopicStats] = useState<
		Map<
			number,
			{
				total: number;
				learned: number;
				greenScore: number;
				yellowScore: number;
			}
		>
	>(new Map());

	useEffect(() => {
		filterTopics().then((topics) => setFilteredTopics(topics));
	}, [filterTopics]);

	useFocusEffect(
		useCallback(() => {
			if (filteredTopics.length === 0 || !user?.userId) {
				setTopicWords([]);
				return;
			}
			const topicIds = filteredTopics.map((t) => t.remoteId);
			wordsRepository
				.getByTopicIds(topicIds, currentCatalogs)
				.then(setTopicWords);
		}, [filteredTopics, currentCatalogs, user?.userId]),
	);

	useEffect(() => {
		if (topicWords.length === 0 || !user?.userId) {
			setTopicStats(new Map());
			return;
		}

		const subscription = learningRepository
			.observeByUser(user.userId)
			.subscribe((progressRecords) => {
				setTopicStats(buildTopicProgressStats(topicWords, progressRecords));
			});

		return () => subscription.unsubscribe();
	}, [topicWords, user?.userId]);

	// Only auto-select a topic when the user explicitly toggles a catalog, not on mount or hydration
	const catalogJustToggledRef = useRef(false);
	const topicProgressReady =
		filteredTopics.length > 0 && topicWords.length > 0 && topicStats.size > 0;

	const getDefaultTopic = useCallback(() => {
		if (filteredTopics.length === 0) {
			return null;
		}

		return (
			filteredTopics.find((topic) => {
				const stats = topicStats.get(topic.remoteId);
				return !stats || stats.total === 0 || stats.learned < stats.total;
			}) ?? filteredTopics[0]
		);
	}, [filteredTopics, topicStats]);

	useEffect(() => {
		if (!catalogJustToggledRef.current) return;
		if (filteredTopics.length === 0) {
			catalogJustToggledRef.current = false;
			setCurrentTopics([]);
			setTopicsInitialized(false);
			return;
		}
		if (!topicProgressReady) return;
		catalogJustToggledRef.current = false;
		const defaultTopic = getDefaultTopic();
		setCurrentTopics(defaultTopic ? [defaultTopic.remoteId] : []);
		setTopicsInitialized(Boolean(defaultTopic));
	}, [
		filteredTopics,
		getDefaultTopic,
		setCurrentTopics,
		setTopicsInitialized,
		topicProgressReady,
	]);

	// On first launch or after a language reset, auto-select the first incomplete filtered topic.
	useEffect(() => {
		if (!_hasHydrated || topicsInitialized || filteredTopics.length === 0)
			return;
		if (!topicProgressReady) return;
		const defaultTopic = getDefaultTopic();
		if (!defaultTopic) return;
		setCurrentTopics([defaultTopic.remoteId]);
		setTopicsInitialized(true);
	}, [
		_hasHydrated,
		topicsInitialized,
		filteredTopics,
		getDefaultTopic,
		setCurrentTopics,
		setTopicsInitialized,
		topicProgressReady,
	]);

	// Persist topic selection to DB after hydration
	useEffect(() => {
		if (!_hasHydrated || !user?.userId) return;
		userSettingsRepository
			.set(
				user.userId.toString(),
				"selected_topics",
				JSON.stringify(currentTopics),
			)
			.catch((err) =>
				logger.error("Failed to persist topic selection", err, "db"),
			);
	}, [currentTopics, _hasHydrated, user?.userId]);

	const fetchCatalogs = useCallback(async (language: string) => {
		const catalogs = (
			await vocabcatalogRepository.getByLanguage(language)
		).sort((a, b) => a.title.localeCompare(b.title));
		setCatalogs(catalogs);
	}, []);

	const fetchTopics = useCallback(async (language: string) => {
		const topics = (await topicsRepository.getByLanguage(language)).sort(
			(a, b) => a.title.localeCompare(b.title),
		);
		setTopics(topics);
	}, []);

	const { topicTranslations: topicTranslationsData, lastSyncTime } =
		useVocabularyStore();

	// biome-ignore lint/correctness/useExhaustiveDependencies: lastSyncTime is a re-fetch trigger after sync completes
	useEffect(() => {
		(async () => {
			if (user?.language_learn) {
				await fetchCatalogs(user.language_learn);
				await fetchTopics(user.language_learn);
			}
		})();
	}, [user?.language_learn, fetchCatalogs, fetchTopics, lastSyncTime]);

	useEffect(() => {
		if (!user?.language_speak || user.language_speak === user?.language_learn) {
			setTopicTranslations(new Map());
			return;
		}
		const map = new Map<number, string>();
		for (const t of topicTranslationsData) {
			map.set(t.topic, t.translation);
		}
		setTopicTranslations(map);
	}, [user?.language_speak, user?.language_learn, topicTranslationsData]);

	const toggleCatalog = useCallback(
		(id: number) => {
			catalogJustToggledRef.current = true;
			if (currentCatalogs.includes(id)) {
				setCurrentCatalogs(currentCatalogs.filter((c) => c !== id));
			} else {
				setCurrentCatalogs([...currentCatalogs, id]);
			}
		},
		[currentCatalogs, setCurrentCatalogs],
	);

	const toggleTopic = useCallback(
		(id: number) => {
			if (currentTopics.includes(id)) {
				setCurrentTopics(currentTopics.filter((t) => t !== id));
			} else {
				setCurrentTopics([...currentTopics, id]);
			}
		},
		[currentTopics, setCurrentTopics],
	);

	const soloSelectTopic = useCallback(
		(id: number) => {
			setCurrentTopics([id]);
		},
		[setCurrentTopics],
	);

	const selectAllTopics = useCallback(() => {
		setCurrentTopics(filteredTopics.map((topic) => topic.remoteId));
	}, [filteredTopics, setCurrentTopics]);

	return {
		t,
		currentCatalogs,
		currentTopics,
		catalogs,
		filteredTopics,
		topicStats,
		topicTranslations,
		toggleCatalog,
		toggleTopic,
		soloSelectTopic,
		selectAllTopics,
	};
}
