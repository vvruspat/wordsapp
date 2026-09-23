import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, View } from "react-native";
import { TrainingAppWrapper } from "@/components/TrainingAppWrapper";
import { MIX_TRAINING_WORD_LIMIT } from "@/constants/training";
import { mixTrainingRepository } from "@/db/repositories/mixTraining.repository";
import { useExcerciseStore } from "@/hooks/useExcerciseStore";
import { useSessionUser } from "@/hooks/useSession";
import { WButton, WText } from "@/mob-ui";
import { Colors } from "@/mob-ui/brand/colors";
import { logger } from "@/utils/logger";

const parseWordIds = (raw: string) =>
	[
		...new Set(
			raw
				.split(",")
				.map(Number)
				.filter((id) => Number.isInteger(id) && id > 0),
		),
	].slice(0, MIX_TRAINING_WORD_LIMIT);

export default function MixTraining() {
	const { t } = useTranslation();
	const { wordIds } = useLocalSearchParams<{ wordIds?: string }>();
	const { user } = useSessionUser();
	const hasHydrated = useExcerciseStore((state) => state._hasHydrated);
	const currentCatalogs = useExcerciseStore((state) => state.currentCatalogs);
	const currentTopics = useExcerciseStore((state) => state.currentTopics);
	const setChunkWordIds = useExcerciseStore((state) => state.setChunkWordIds);
	const [ready, setReady] = useState(false);
	const [hasWords, setHasWords] = useState(true);

	useEffect(() => {
		if (
			!hasHydrated ||
			!user?.userId ||
			!user.language_learn ||
			!user.language_speak
		) {
			return;
		}

		const chunkIds = useExcerciseStore.getState().chunkWordIds;
		if (!wordIds && chunkIds?.length) {
			const selectedIds = [...new Set(chunkIds)].slice(
				0,
				MIX_TRAINING_WORD_LIMIT,
			);
			setChunkWordIds(selectedIds);
			setHasWords(selectedIds.length > 0);
			setReady(true);
			return;
		}

		let active = true;
		const newWordIds = wordIds ? parseWordIds(wordIds) : [];
		setReady(false);
		const selection = wordIds
			? mixTrainingRepository.getDialogueWordIds({
					newWordIds,
					userId: user.userId,
					learningLanguage: user.language_learn,
					nativeLanguage: user.language_speak,
					selectedCatalogIds: currentCatalogs,
				})
			: mixTrainingRepository.getDefaultWordIds({
					learningLanguage: user.language_learn,
					nativeLanguage: user.language_speak,
					selectedCatalogIds: currentCatalogs,
					selectedTopicIds: currentTopics,
				});
		selection
			.then((selectedIds) => {
				if (!active) return;
				setChunkWordIds(selectedIds);
				setHasWords(selectedIds.length > 0);
				setReady(true);
			})
			.catch((error) => {
				if (!active) return;
				logger.error("Failed to prepare mix training words", error, "db");
				setChunkWordIds(newWordIds);
				setHasWords(newWordIds.length > 0);
				setReady(true);
			});

		return () => {
			active = false;
		};
	}, [
		hasHydrated,
		wordIds,
		user?.userId,
		user?.language_learn,
		user?.language_speak,
		currentCatalogs,
		currentTopics,
		setChunkWordIds,
	]);

	if (!ready) {
		return (
			<View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
				<ActivityIndicator color={Colors.primary.base} size="large" />
			</View>
		);
	}

	if (!hasWords) {
		return (
			<View style={{ flex: 1, justifyContent: "center", gap: 16, padding: 24 }}>
				<WText mode="secondary" wrap>
					{t("mix_training_no_words")}
				</WText>
				<WButton mode="dark" fullWidth onPress={() => router.back()}>
					<WText>{t("button_cancel")}</WText>
				</WButton>
			</View>
		);
	}

	return <TrainingAppWrapper excludedExercises={["cards"]} />;
}
