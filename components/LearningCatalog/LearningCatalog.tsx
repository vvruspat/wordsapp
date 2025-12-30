import { WCard, WText } from "@/mob-ui";
import { Colors } from "@/mob-ui/brand/colors";
import { useCallback } from "react";
import {
	FlatList,
	ListRenderItemInfo,
	Pressable,
	StyleProp,
	ViewStyle,
} from "react-native";
import { trainingComponents } from "./components";
import { apps, type LearningCatalogItem } from "./types";

export type LearningTrainingComponent =
	(typeof trainingComponents)[keyof typeof trainingComponents];

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
