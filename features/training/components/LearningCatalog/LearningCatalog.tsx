import { useTrainingCatalogStats } from "../../hooks/useTrainingCatalogStats";
import { useCallback } from "react";
import {
	FlatList,
	ListRenderItemInfo,
	Pressable,
	StyleProp,
	ViewStyle,
} from "react-native";
import { WCard, WText } from "@/mob-ui";
import { Colors } from "@/mob-ui/brand/colors";
import { TrainingProgressBar } from "@/features/training/components/TrainingProgressBar";
import {
	EXERCISES_APPS,
	LearningTrainingName,
} from "@/shared/training/presentation";

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
	const { t, isAudioReady, isAudioReadinessLoading, trainingStats } =
		useTrainingCatalogStats();

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
			const stats = trainingStats[item.id];
			const disabled =
				!onTrainingPress ||
				(item.id === "listening_practice" &&
					(isAudioReadinessLoading || !isAudioReady));

			return (
				<Pressable
					style={{ flex: 1 }}
					onPress={() => handlePress(item.id)}
					disabled={disabled}
				>
					<WCard
						style={{
							backgroundColor: palette.backgroundColor,
							gap: 12,
							padding: 16,
							minHeight: 148,
							opacity: disabled ? 0.55 : 1,
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
							style={{ color: palette.descriptionColor, flex: 1 }}
						>
							{t(item.descriptionId)}
						</WText>
						{stats && (
							<>
								<WText
									mode="tertiary"
									size="sm"
									style={{ color: palette.descriptionColor }}
								>
									{stats.successCount}/{stats.totalCount}
								</WText>
								<TrainingProgressBar
									successCount={stats.successCount}
									totalCount={stats.totalCount}
									backgroundColor={Colors.greys.grey4}
								/>
							</>
						)}
					</WCard>
				</Pressable>
			);
		},
		[
			handlePress,
			isAudioReady,
			isAudioReadinessLoading,
			isTrainingSelected,
			onTrainingPress,
			t,
			trainingStats,
		],
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
