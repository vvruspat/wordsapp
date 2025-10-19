import { WCard, WText } from "@/mob-ui";
import { Colors } from "@/mob-ui/brand/colors";
import type { Training } from "@repo/types";
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
	FlatList,
	ListRenderItemInfo,
	Pressable,
	StyleProp,
	ViewStyle,
} from "react-native";
import {
	ChooseTranslationExercise,
	ListeningPracticeExercise,
	MatchWordsExercise,
	TrueOrFalseExercise,
	TypeTranslationExercise,
} from "../TrainingExercises";

export const apps = {
	true_or_false: {
		titleColor: Colors.dark.black,
		backgroundColor: "#F9A1FF",
		descriptionColor: Colors.dark.dark1,
		component: TrueOrFalseExercise,
	},
	choose_translation: {
		titleColor: Colors.dark.black,
		backgroundColor: "#8FDAFF",
		descriptionColor: Colors.dark.dark1,
		component: ChooseTranslationExercise,
	},
	type_translation: {
		titleColor: Colors.dark.black,
		backgroundColor: "#FFA83E",
		descriptionColor: Colors.dark.dark1,
		component: TypeTranslationExercise,
	},
	match_words: {
		titleColor: Colors.dark.black,
		backgroundColor: "#C6F432",
		descriptionColor: Colors.dark.dark1,
		component: MatchWordsExercise,
	},
	listening_practice: {
		titleColor: Colors.dark.black,
		backgroundColor: "#B394FD",
		descriptionColor: Colors.dark.dark1,
		component: ListeningPracticeExercise,
	},
} as const;

export type LearningTrainingName = keyof typeof apps;
export type LearningTrainingComponent =
	(typeof apps)[LearningTrainingName]["component"];

export type LearningCatalogItem = Training & {
	name: LearningTrainingName;
	component: LearningTrainingComponent;
};

export type LearningCatalogProps = {
	trainings: readonly LearningCatalogItem[];
	onTrainingPress?: (training: LearningCatalogItem) => void;
	isTrainingSelected?: (training: LearningCatalogItem) => boolean;
	numColumns?: number;
	style?: StyleProp<ViewStyle>;
	contentContainerStyle?: StyleProp<ViewStyle>;
	columnWrapperStyle?: StyleProp<ViewStyle>;
};

export function LearningCatalog({
	trainings,
	onTrainingPress,
	isTrainingSelected,
	numColumns = 2,
	style,
	contentContainerStyle,
	columnWrapperStyle,
}: LearningCatalogProps) {
	const handlePress = useCallback(
		(training: LearningCatalogItem) => {
			onTrainingPress?.(training);
		},
		[onTrainingPress],
	);

	const renderItem = useCallback(
		({ item }: ListRenderItemInfo<LearningCatalogItem>) => {
			const palette = apps[item.name] ?? {
				titleColor: Colors.dark.black,
				backgroundColor: Colors.dark.dark4,
				descriptionColor: Colors.dark.dark1,
			};
			const selected = isTrainingSelected?.(item) ?? false;

			return (
				<Pressable
					style={{ flex: 1 }}
					onPress={() => handlePress(item)}
					disabled={!onTrainingPress}
				>
					<WCard
						style={{
							backgroundColor: palette.backgroundColor,
							gap: 32,
							padding: 16,
							borderWidth: selected ? 2 : 0,
							borderColor: selected ? Colors.greys.white : Colors.transparent,
						}}
					>
						<WText
							mode="primary"
							size="lg"
							style={{ color: palette.titleColor }}
						>
							{item.title}
						</WText>
						<WText
							mode="tertiary"
							size="sm"
							style={{ color: palette.descriptionColor }}
						>
							{item.description}
						</WText>
					</WCard>
				</Pressable>
			);
		},
		[handlePress, isTrainingSelected, onTrainingPress],
	);

	return (
		<FlatList
			data={Array.from(trainings)}
			renderItem={renderItem}
			keyExtractor={(item) => item.id.toString()}
			numColumns={numColumns}
			style={[{ width: "100%" }, style]}
			columnWrapperStyle={[{ gap: 16 }, columnWrapperStyle]}
			contentContainerStyle={[{ gap: 16 }, contentContainerStyle]}
			showsVerticalScrollIndicator={false}
		/>
	);
}

export type { apps as learningAppStyles };

export function useLearningTrainings(): readonly LearningCatalogItem[] {
	const { t } = useTranslation();

	return useMemo<LearningCatalogItem[]>(
		() => [
			{
				id: 1,
				created_at: "2023-01-01T00:00:00Z",
				title: t("app_true_or_false_title"),
				description: t("app_true_or_false_description"),
				score: 0,
				name: "true_or_false",
				image: "",
				component: apps.true_or_false.component,
			},
			{
				id: 2,
				created_at: "2023-01-02T00:00:00Z",
				title: t("app_choose_translation_title"),
				description: t("app_choose_translation_description"),
				score: 0,
				name: "choose_translation",
				image: "",
				component: apps.choose_translation.component,
			},
			{
				id: 3,
				created_at: "2023-01-03T00:00:00Z",
				title: t("app_type_translation_title"),
				description: t("app_type_translation_description"),
				score: 0,
				name: "type_translation",
				image: "",
				component: apps.type_translation.component,
			},
			{
				id: 4,
				created_at: "2023-01-04T00:00:00Z",
				title: t("app_match_words_title"),
				description: t("app_match_words_description"),
				score: 0,
				name: "match_words",
				image: "",
				component: apps.match_words.component,
			},
			{
				id: 5,
				created_at: "2023-01-04T00:00:00Z",
				title: t("app_listening_practice_title"),
				description: t("app_listening_practice_description"),
				score: 0,
				name: "listening_practice",
				image: "",
				component: apps.listening_practice.component,
			},
		],
		[t],
	);
}
