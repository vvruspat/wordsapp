import { Model } from "@nozbe/watermelondb";
import { useDatabase } from "@nozbe/watermelondb/hooks";
import { VocabCatalog } from "@repo/types";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, ListRenderItemInfo, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { VocabCatalogItem } from "@/components/VocabCatalogItem";
import { WText } from "@/mob-ui";
import { styles } from "../../general.styles";

const DATA: VocabCatalog[] = [
	{
		id: 1,
		created_at: "2023-01-01T00:00:00Z",
		owner: 1,
		title: "Spanish Basics",
		description: "Learn the basics of Spanish",
		language: "es",
		image: null,
	},
	{
		id: 2,
		created_at: "2023-01-02T00:00:00Z",
		owner: 1,
		title: "French Basics",
		description: "Learn the basics of French",
		language: "fr",
		image: null,
	},
	{
		id: 3,
		created_at: "2023-01-03T00:00:00Z",
		owner: 1,
		title: "German Basics",
		description: "Learn the basics of German",
		language: "de",
		image: null,
	},
	{
		id: 4,
		created_at: "2023-01-04T00:00:00Z",
		owner: 1,
		title: "Italian Basics",
		description: "Learn the basics of Italian",
		language: "it",
		image: null,
	},
	{
		id: 5,
		created_at: "2023-01-05T00:00:00Z",
		owner: 1,
		title: "Japanese Basics",
		description: "Learn the basics of Japanese",
		language: "ja",
		image: null,
	},
	{
		id: 6,
		created_at: "2023-01-06T00:00:00Z",
		owner: 1,
		title: "Chinese Basics",
		description: "Learn the basics of Chinese",
		language: "zh",
		image: null,
	},
	{
		id: 7,
		created_at: "2023-01-07T00:00:00Z",
		owner: 1,
		title: "Dutch Basics",
		description: "Learn the basics of Dutch",
		language: "nl",
		image: null,
	},
	{
		id: 8,
		created_at: "2023-01-08T00:00:00Z",
		owner: 1,
		title: "Russian Basics",
		description: "Learn the basics of Russian",
		language: "ru",
		image: null,
	},
	{
		id: 9,
		created_at: "2023-01-09T00:00:00Z",
		owner: 1,
		title: "Portuguese Basics",
		description: "Learn the basics of Portuguese",
		language: "pt",
		image: null,
	},
	{
		id: 10,
		created_at: "2023-01-10T00:00:00Z",
		owner: 1,
		title: "Korean Basics",
		description: "Learn the basics of Korean",
		language: "ko",
		image: null,
	},
	{
		id: 11,
		created_at: "2023-01-11T00:00:00Z",
		owner: 1,
		title: "Arabic Basics",
		description: "Learn the basics of Arabic",
		language: "ar",
		image: null,
	},
];

export default function Catalog() {
	const { t } = useTranslation();
	const database = useDatabase();

	const [progress, setProgress] = useState<Model[]>([]);

	useEffect(() => {
		const progressCollection = database.get("learning_progress");

		const subscription = progressCollection
			.query()
			.observe()
			.subscribe(setProgress);

		return () => subscription.unsubscribe();
	}, [database]);

	useEffect(() => {
		// Here you can use the `progress` state to update your UI or perform other actions
		console.log("Learning progress updated:", progress);
	}, [progress]);

	const renderItem = (item: ListRenderItemInfo<VocabCatalog>) => {
		return <VocabCatalogItem {...item.item} />;
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
					{t("catalog_title")}
				</WText>

				<FlatList
					data={DATA}
					style={{ width: "100%" }}
					columnWrapperStyle={{
						gap: 16,
					}}
					contentContainerStyle={{
						gap: 16,
					}}
					renderItem={renderItem}
					keyExtractor={(item) => item.id.toString()}
					numColumns={2}
				/>
			</View>
		</SafeAreaView>
	);
}
