import { Training } from "@repo/types";
import { Link } from "expo-router";
import { useContext, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, ListRenderItemInfo, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackgroundContext } from "@/context/BackgroundContext";
import { WCard, WText } from "@/mob-ui";
import { Colors } from "@/mob-ui/brand/colors";
import { styles } from "../../../general.styles";

const appsStyles = {
	true_or_false: {
		titleColor: Colors.dark.black,
		backgroundColor: "#F9A1FF",
		descriptionColor: Colors.dark.dark1,
	},
	choose_translation: {
		titleColor: Colors.dark.black,
		backgroundColor: "#8FDAFF",
		descriptionColor: Colors.dark.dark1,
	},
	type_translation: {
		titleColor: Colors.dark.black,
		backgroundColor: "#FFA83E",
		descriptionColor: Colors.dark.dark1,
	},
	match_words: {
		titleColor: Colors.dark.black,
		backgroundColor: "#C6F432",
		descriptionColor: Colors.dark.dark1,
	},
	listening_practice: {
		titleColor: Colors.dark.black,
		backgroundColor: "#B394FD",
		descriptionColor: Colors.dark.dark1,
	},
} as const;

export default function Learning() {
	const { setColor, setOpacity } = useContext(BackgroundContext);
	const { t } = useTranslation();

	useEffect(() => {
		setColor(Colors.backgrounds.green);
		setOpacity(1);

		return () => {
			setOpacity(0.3);
		};
	}, [setColor, setOpacity]);

	const DATA = useMemo(
		() =>
			[
				{
					id: 1,
					created_at: "2023-01-01T00:00:00Z",
					title: t("app_true_or_false_title"),
					description: t("app_true_or_false_description"),
					score: 0,
					name: "true_or_false",
					image: "",
				},
				{
					id: 2,
					created_at: "2023-01-02T00:00:00Z",
					title: t("app_choose_translation_title"),
					description: t("app_choose_translation_description"),
					score: 0,
					name: "choose_translation",
					image: "",
				},
				{
					id: 3,
					created_at: "2023-01-03T00:00:00Z",
					title: t("app_type_translation_title"),
					description: t("app_type_translation_description"),
					score: 0,
					name: "type_translation",
					image: "",
				},
				{
					id: 4,
					created_at: "2023-01-04T00:00:00Z",
					title: t("app_match_words_title"),
					description: t("app_match_words_description"),
					score: 0,
					name: "match_words",
					image: "",
				},
				{
					id: 5,
					created_at: "2023-01-04T00:00:00Z",
					title: t("app_listening_practice_title"),
					description: t("app_listening_practice_description"),
					score: 0,
					name: "listening_practice",
					image: "",
				},
			] as const,
		[t],
	);

	const renderItem = (
		item: ListRenderItemInfo<
			Training & {
				name: keyof typeof appsStyles;
			}
		>,
	) => {
		return (
			<Link
				href={`/authorized/learning/${item.item.name}` as any}
				style={{ flex: 1 }}
			>
				<WCard
					header={
						<WText
							mode="primary"
							size="lg"
							style={{
								color: appsStyles[item.item.name]
									? appsStyles[item.item.name].titleColor
									: Colors.dark.black,
							}}
						>
							{item.item.title}
						</WText>
					}
					style={{
						backgroundColor: appsStyles[item.item.name]
							? appsStyles[item.item.name].backgroundColor
							: Colors.dark.dark4,
						gap: 32,
						padding: 16,
					}}
				>
					<WText
						mode="tertiary"
						size="sm"
						style={{
							color: appsStyles[item.item.name as keyof typeof appsStyles]
								? appsStyles[item.item.name as keyof typeof appsStyles]
										.descriptionColor
								: Colors.dark.dark1,
						}}
					>
						{item.item.description}
					</WText>
				</WCard>
			</Link>
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
					{t("learning_title")}
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
