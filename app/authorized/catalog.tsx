import { TopicItem } from "@/components/TopicItem";
import { VocabCatalogItem } from "@/components/VocabCatalogItem";
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
import { WText } from "@/mob-ui";
import { buildTopicProgressStats } from "@/utils/topicProgress";
import { logger } from "@/utils/logger";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, ListRenderItemInfo, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { styles } from "../../general.styles";

export default function Catalog() {
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
			{ total: number; learned: number; greenScore: number; yellowScore: number }
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
			wordsRepository.getByTopicIds(topicIds, currentCatalogs).then(setTopicWords);
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
			filteredTopics.find(
				(topic) => (topicStats.get(topic.remoteId)?.learned ?? 0) === 0,
			) ?? filteredTopics[0]
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

	// On first launch or after a language reset, auto-select the first unlearned filtered topic.
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

	// Persist catalog selection to DB after hydration
	useEffect(() => {
		if (!_hasHydrated || !user?.userId) return;
		userSettingsRepository
			.set(
				user.userId.toString(),
				"selected_catalogs",
				JSON.stringify(currentCatalogs),
			)
			.catch((err) =>
				logger.error("Failed to persist catalog selection", err, "db"),
			);
	}, [currentCatalogs, _hasHydrated, user?.userId]);

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
		const topics = (await topicsRepository.getByLanguage(language)).sort((a, b) =>
			a.title.localeCompare(b.title),
		);
		setTopics(topics);
	}, []);

	const { topicTranslations: topicTranslationsData, lastSyncTime } = useVocabularyStore();

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

	// Auto-select A1 + A2 by default only on first launch (nothing persisted)
	// Also set the ref so that all topics for those catalogs are selected too (#31)
	useEffect(() => {
		if (_hasHydrated && catalogs.length > 0 && currentCatalogs.length === 0) {
			catalogJustToggledRef.current = true;
			const levelDefaults = catalogs
				.filter((c) => c.title === "A1" || c.title === "A2")
				.map((c) => c.remoteId);
			const defaults =
				levelDefaults.length > 0 ? levelDefaults : [catalogs[0].remoteId];
			setCurrentCatalogs(defaults);
		}
	}, [_hasHydrated, catalogs, currentCatalogs, setCurrentCatalogs]);

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

	const renderTopicItem = (item: ListRenderItemInfo<Topic>) => {
		const stats = topicStats.get(item.item.remoteId);
		return (
			<TopicItem
				title={item.item.title}
				translatedTitle={topicTranslations.get(item.item.remoteId)}
				selected={currentTopics.includes(item.item.remoteId)}
				onPress={() => toggleTopic(item.item.remoteId)}
				onLongPress={() => soloSelectTopic(item.item.remoteId)}
				learnedCount={stats?.learned}
				totalCount={stats?.total}
				greenScore={stats?.greenScore}
				yellowScore={stats?.yellowScore}
			/>
		);
	};

	const renderVocabCatalogItem = (item: ListRenderItemInfo<VocabCatalog>) => {
		return (
			<VocabCatalogItem
				title={item.item.title}
				selected={currentCatalogs.includes(item.item.remoteId)}
				onPress={() => toggleCatalog(item.item.remoteId)}
			/>
		);
	};

	return (
		<SafeAreaView
			mode="padding"
			edges={["top", "left", "right"]}
			style={styles.page}
		>
			<View
				style={{
					gap: 16,
					flex: 1,
					width: "100%",
					alignItems: "flex-start",
					justifyContent: "flex-start",
				}}
			>
				<WText mode="primary" size="2xl">
					{t("level_title")}
				</WText>

				<FlatList
					data={catalogs}
					style={{
						width: "100%",
						flexGrow: 0,
						flexShrink: 0,
					}}
					columnWrapperStyle={{
						gap: 16,
					}}
					contentContainerStyle={{
						gap: 16,
					}}
					renderItem={renderVocabCatalogItem}
					keyExtractor={(item) => item.remoteId.toString()}
					numColumns={5}
				/>

				<View
					style={{
						width: "100%",
						flexDirection: "row",
						alignItems: "center",
						justifyContent: "space-between",
						gap: 12,
					}}
				>
						<WText mode="primary" size="2xl">
							{t("topics_title")}
						</WText>
						{filteredTopics.length > 0 && (
							<Pressable onPress={selectAllTopics}>
								<WText mode="secondary" size="md">
									{t("select_all_topics")}
								</WText>
							</Pressable>
						)}
					</View>

				<View style={{ flex: 1, width: "100%", overflow: "hidden" }}>
					<FlatList
						data={filteredTopics}
						style={{ width: "100%" }}
						contentContainerStyle={{
							gap: 16,
						}}
						renderItem={renderTopicItem}
						keyExtractor={(item) => item.remoteId.toString()}
						numColumns={1}
						ListFooterComponent={<View style={{ height: 16 }} />}
					/>
				</View>
			</View>
		</SafeAreaView>
	);
}
