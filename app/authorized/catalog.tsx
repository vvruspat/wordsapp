import { TopicItem } from "@/components/TopicItem";
import { VocabCatalogItem } from "@/components/VocabCatalogItem";
import Topic from "@/db/models/Topic";
import VocabCatalog from "@/db/models/VocabCatalog";
import { topicsRepository } from "@/db/repositories/topics.repository";
import { vocabcatalogRepository } from "@/db/repositories/vocabcatalog.repository";
import { wordsRepository } from "@/db/repositories/words.repository";
import { useExcerciseStore } from "@/hooks/useExcerciseStore";
import { useSessionUser } from "@/hooks/useSession";
import { WText } from "@/mob-ui";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, ListRenderItemInfo, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { styles } from "../../general.styles";

export default function Catalog() {
	const { t } = useTranslation();

	const { currentCatalog, currentTopic, setCurrentCatalog, setCurrentTopic } =
		useExcerciseStore();
	const { user } = useSessionUser();

	const [catalogs, setCatalogs] = useState<VocabCatalog[]>([]);
	const [topics, setTopics] = useState<Topic[]>([]);

	const filterTopics = useCallback(async (): Promise<Topic[]> => {
		if (!currentCatalog) {
			return [];
		}
		const wordsTopics =
			await wordsRepository.getTopicsByCatalog(currentCatalog);
		return topics.filter((topic) => wordsTopics.has(topic.remoteId));
	}, [topics, currentCatalog]);

	const [filteredTopics, setFilteredTopics] = useState<Topic[]>([]);

	useEffect(() => {
		filterTopics().then((topics) => setFilteredTopics(topics));
	}, [filterTopics]);

	const fetchCatalogs = useCallback(async (language: string) => {
		const catalogs = (
			await vocabcatalogRepository.getByLanguage(language)
		).sort((a, b) => a.title.localeCompare(b.title));
		setCatalogs(catalogs);
	}, []);

	const fetchTopics = useCallback(async (language: string) => {
		const topics = await topicsRepository.getByLanguage(language);
		setTopics(topics);
	}, []);

	useEffect(() => {
		(async () => {
			if (user?.language_learn) {
				await fetchCatalogs(user.language_learn);
				await fetchTopics(user.language_learn);
			}
		})();
	}, [user?.language_learn, fetchCatalogs, fetchTopics]);

	const renderTopicItem = (item: ListRenderItemInfo<Topic>) => {
		return (
			<TopicItem
				title={item.item.title}
				selected={item.item.remoteId === currentTopic}
				onPress={() => setCurrentTopic(item.item.remoteId)}
			/>
		);
	};

	const renderVocabCatalogItem = (item: ListRenderItemInfo<VocabCatalog>) => {
		return (
			<VocabCatalogItem
				title={item.item.title}
				selected={item.item.remoteId === currentCatalog}
				onPress={() => setCurrentCatalog(item.item.remoteId)}
			/>
		);
	};

	return (
		<SafeAreaView mode="padding" style={styles.page}>
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
						flexShrink: 1,
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

				<WText mode="primary" size="2xl">
					{t("topics_title")}
				</WText>

				<FlatList
					data={filteredTopics}
					style={{ width: "100%", flexGrow: 0, flexShrink: 1 }}
					contentContainerStyle={{
						gap: 16,
					}}
					renderItem={renderTopicItem}
					keyExtractor={(item) => item.remoteId.toString()}
					numColumns={1}
				/>
			</View>
		</SafeAreaView>
	);
}
