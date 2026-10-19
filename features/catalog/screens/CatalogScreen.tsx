import { FlatList, ListRenderItemInfo, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Topic from "@/db/models/Topic";
import VocabCatalog from "@/db/models/VocabCatalog";
import { TopicItem } from "@/features/catalog/components/TopicItem";
import { VocabCatalogItem } from "@/features/catalog/components/VocabCatalogItem";
import { styles } from "@/general.styles";
import { WText } from "@/mob-ui";
import { useCatalog } from "../hooks/useCatalog";

export default function Catalog() {
	const {
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
	} = useCatalog();
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
			{error ? <WText>{String(error)}</WText> : null}
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
