import { WCard, WText } from "@/mob-ui";
import { Colors } from "@/mob-ui/brand/colors";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
	FlatList,
	ListRenderItemInfo,
	Pressable,
	StyleProp,
	ViewStyle,
} from "react-native";
import { EXERCISES_APPS, LearningTrainingName } from "./types";

export type LearningCatalogProps = {
	onTrainingPress?: (trainingId: LearningTrainingName) => void;
	isTrainingSelected?: (trainingId: LearningTrainingName) => boolean;
	numColumns?: number;
	style?: StyleProp<ViewStyle>;
	contentContainerStyle?: StyleProp<ViewStyle>;
	columnWrapperStyle?: StyleProp<ViewStyle>;
};

export function LearningCatalog({
	onTrainingPress,
	isTrainingSelected,
	numColumns = 2,
	style,
	contentContainerStyle,
	columnWrapperStyle,
}: LearningCatalogProps) {
	const { t } = useTranslation();

	const handlePress = useCallback(
		(trainingId: LearningTrainingName) => {
			onTrainingPress?.(trainingId);
		},
		[onTrainingPress],
	);

	const renderItem = useCallback(
		({
			item,
		}: ListRenderItemInfo<
			(typeof EXERCISES_APPS)[keyof typeof EXERCISES_APPS]
		>) => {
			const palette = item ?? {
				titleColor: Colors.dark.black,
				backgroundColor: Colors.dark.dark4,
				descriptionColor: Colors.dark.dark1,
			};
			const selected = isTrainingSelected?.(item.id) ?? false;

			return (
				<Pressable
					style={{ flex: 1 }}
					onPress={() => handlePress(item.id)}
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
							{t(item.titleId)}
						</WText>
						<WText
							mode="tertiary"
							size="sm"
							style={{ color: palette.descriptionColor }}
						>
							{t(item.descriptionId)}
						</WText>
					</WCard>
				</Pressable>
			);
		},
		[handlePress, isTrainingSelected, onTrainingPress, t],
	);

	return (
		<FlatList
			data={Object.values(EXERCISES_APPS)}
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
