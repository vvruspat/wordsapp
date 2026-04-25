import { Q } from "@nozbe/watermelondb";
import { useDatabase } from "@nozbe/watermelondb/hooks";
import { combineLatest } from "rxjs";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
	FlatList,
	ListRenderItemInfo,
	Pressable,
	StyleProp,
	ViewStyle,
} from "react-native";
import LearningProgress from "@/db/models/LearningProgress";
import Word from "@/db/models/Word";
import { useAudioReadiness } from "@/hooks/useAudioReadiness";
import { useExcerciseStore } from "@/hooks/useExcerciseStore";
import { useSessionUser } from "@/hooks/useSession";
import { WCard, WText } from "@/mob-ui";
import { Colors } from "@/mob-ui/brand/colors";
import { TrainingProgressBar } from "../TrainingProgressBar";
import { EXERCISES_APPS, LearningTrainingName } from "./types";

type TrainingCardStats = {
	successCount: number;
	totalCount: number;
};

type TrainingCardStatsMap = Record<LearningTrainingName, TrainingCardStats>;

function createEmptyTrainingStats(totalCount: number = 0): TrainingCardStatsMap {
	return {
		cards: { successCount: 0, totalCount },
		true_or_false: { successCount: 0, totalCount },
		choose_translation: { successCount: 0, totalCount },
		type_word: { successCount: 0, totalCount },
		match_words: { successCount: 0, totalCount },
		listening_practice: { successCount: 0, totalCount },
	};
}

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
	const database = useDatabase();
	const { user } = useSessionUser();
	const { currentCatalogs, currentTopics } = useExcerciseStore();
	const { isAudioReady, isAudioReadinessLoading } = useAudioReadiness();
	const [trainingStats, setTrainingStats] = useState<TrainingCardStatsMap>(
		createEmptyTrainingStats(),
	);

	const handlePress = useCallback(
		(trainingId: LearningTrainingName) => {
			onTrainingPress?.(trainingId);
		},
		[onTrainingPress],
	);

	useEffect(() => {
		if (!user?.language_learn) {
			setTrainingStats(createEmptyTrainingStats());
			return;
		}

		const wordConditions = [Q.where("language", user.language_learn)];

		if (currentCatalogs.length > 0) {
			wordConditions.push(Q.where("catalog", Q.oneOf(currentCatalogs)));
		}

		if (currentTopics.length > 0) {
			wordConditions.push(Q.where("topic", Q.oneOf(currentTopics)));
		}

		const wordsQuery = database.get<Word>("words").query(...wordConditions);
		const progressQuery =
			user.userId != null
				? database
						.get<LearningProgress>("learning_progress")
						.query(Q.where("user_id", user.userId))
				: null;

		const buildStats = (
			words: Word[],
			progressRecords: LearningProgress[] = [],
		): TrainingCardStatsMap => {
			const availableWordIds = new Set(words.map((word) => word.remoteId));
			const nextStats = createEmptyTrainingStats(availableWordIds.size);
			const learnedWordIdsByTraining = Object.fromEntries(
				Object.keys(EXERCISES_APPS).map((trainingId) => [
					trainingId,
					new Set<number>(),
				]),
			) as Record<LearningTrainingName, Set<number>>;

			for (const progressRecord of progressRecords) {
				if (!progressRecord.training) {
					continue;
				}

				const trainingId = progressRecord.training as LearningTrainingName;

				if (!(trainingId in EXERCISES_APPS)) {
					continue;
				}

				if (!availableWordIds.has(progressRecord.wordId)) {
					continue;
				}

				learnedWordIdsByTraining[trainingId].add(progressRecord.wordId);
			}

			for (const trainingId of Object.keys(
				learnedWordIdsByTraining,
			) as LearningTrainingName[]) {
				nextStats[trainingId].successCount =
					learnedWordIdsByTraining[trainingId].size;
			}

			return nextStats;
		};

		const subscription = progressQuery
			? combineLatest([wordsQuery.observe(), progressQuery.observe()]).subscribe(
					([words, progressRecords]) => {
						setTrainingStats(buildStats(words, progressRecords));
					},
				)
			: wordsQuery.observe().subscribe((words) => {
					setTrainingStats(buildStats(words));
				});

		return () => {
			subscription.unsubscribe();
		};
	}, [
		currentCatalogs,
		currentTopics,
		database,
		user?.language_learn,
		user?.userId,
	]);

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
