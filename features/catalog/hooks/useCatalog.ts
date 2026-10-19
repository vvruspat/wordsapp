import { useOperationScope } from "@/shared/lifecycle/useOperationScope";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import Topic from "@/db/models/Topic";
import VocabCatalog from "@/db/models/VocabCatalog";
import Word from "@/db/models/Word";
import { learningRepository } from "@/db/repositories/learning.repository";
import { topicsRepository } from "@/db/repositories/topics.repository";
import { userSettingsRepository } from "@/db/repositories/userSettings.repository";
import { vocabcatalogRepository } from "@/db/repositories/vocabcatalog.repository";
import { wordsRepository } from "@/db/repositories/words.repository";
import { useSelectionStore } from "@/shared/selection/selectionStore";
import { useSessionUser } from "@/shared/session/useSession";
import { useVocabularyStore } from "@/shared/vocabulary/vocabularyStore";
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
	} = useSelectionStore();
	const { user } = useSessionUser();
	const begin = useOperationScope(
		JSON.stringify([
			user?.userId,
			user?.language_learn,
			user?.language_speak,
			currentCatalogs,
		]),
	);
	const [error, setError] = useState<unknown>(null);

	const [catalogs, setCatalogs] = useState<VocabCatalog[]>([]);
	const [topics, setTopics] = useState<Topic[]>([]);

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
		const current = begin();
		let active = true;
		void filterTopics()
			.then((value) => {
				if (active && current()) setFilteredTopics(value);
			})
			.catch((reason) => {
				if (active && current()) setError(reason);
				logger.error("Unable to filter catalog topics", reason, "db");
			});
		return () => {
			active = false;
		};
	}, [filterTopics, begin]);

	useFocusEffect(
		useCallback(() => {
			const current = begin();
			let active = true;
			if (filteredTopics.length === 0 || !user?.userId) {
				setTopicWords([]);
				return;
			}
			const topicIds = filteredTopics.map((t) => t.remoteId);
			wordsRepository
				.getByTopicIds(topicIds, currentCatalogs)
				.then((value) => {
					if (active && current()) setTopicWords(value);
				})
				.catch((reason) => {
					if (active && current()) setError(reason);
					logger.error("Unable to load catalog words", reason, "db");
				});
			return () => {
				active = false;
			};
		}, [filteredTopics, currentCatalogs, user?.userId, begin]),
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

	const { topicTranslations: topicTranslationsData, lastSyncTime } =
		useVocabularyStore();
	useEffect(() => {
		const current = begin();
		let active = true;
		setError(null);
		const syncVersion = lastSyncTime;
		if (!user?.language_learn) {
			setCatalogs([]);
			setTopics([]);
			return;
		}
		void Promise.all([
			vocabcatalogRepository.getByLanguage(user.language_learn),
			topicsRepository.getByLanguage(user.language_learn),
		])
			.then(([catalogs, topics]) => {
				if (
					!active ||
					!current() ||
					useVocabularyStore.getState().lastSyncTime !== syncVersion
				)
					return;
				setCatalogs(catalogs.sort((a, b) => a.title.localeCompare(b.title)));
				setTopics(topics.sort((a, b) => a.title.localeCompare(b.title)));
			})
			.catch((reason) => {
				if (active && current()) setError(reason);
				logger.error("Unable to load catalog", reason, "db");
			});
		return () => {
			active = false;
		};
	}, [begin, user?.language_learn, lastSyncTime]);
	const topicTranslations = useMemo(() => {
		if (!user?.language_speak || user.language_speak === user.language_learn)
			return new Map<number, string>();
		return new Map(
			topicTranslationsData.map((item) => [item.topic, item.translation]),
		);
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
		error,
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
