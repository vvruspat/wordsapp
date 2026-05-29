import { router } from "expo-router";
import { useCallback, useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LearningCatalog } from "@/components/LearningCatalog";
import { BackgroundContext } from "@/context/BackgroundContext";
import { learningRepository } from "@/db/repositories/learning.repository";
import { wordsRepository } from "@/db/repositories/words.repository";
import { CHUNK_SIZE, useChunkManagement } from "@/hooks/useChunkManagement";
import { useExcerciseStore } from "@/hooks/useExcerciseStore";
import { useSessionUser } from "@/hooks/useSession";
import { WButton, WCard, WText } from "@/mob-ui";
import { Colors } from "@/mob-ui/brand/colors";
import { styles } from "../../../general.styles";

export default function Learning() {
	const { setColor, setOpacity } = useContext(BackgroundContext);
	const { t } = useTranslation();
	const { user } = useSessionUser();
	const { currentCatalogs, currentTopics, setChunkWordIds } =
		useExcerciseStore();

	const userId = user?.userId != null ? String(user.userId) : undefined;
	const {
		shouldShowProposal,
		loading: chunkLoading,
		markProposed,
	} = useChunkManagement(userId, currentTopics, currentCatalogs);

	const [untrainedWords, setUntrainedWords] = useState<{ remoteId: number }[]>(
		[],
	);
	const [proposalDismissed, setProposalDismissed] = useState(false);

	// Load untrained words when conditions might warrant showing proposal
	useEffect(() => {
		if (!user?.userId || !user?.language_learn) return;
		wordsRepository
			.getOrderedUntrainedWords(
				user.language_learn,
				CHUNK_SIZE,
				user.userId,
				currentTopics.length > 0 ? currentTopics : undefined,
				currentCatalogs.length > 0 ? currentCatalogs : undefined,
			)
			.then(setUntrainedWords);
	}, [user?.userId, user?.language_learn, currentTopics, currentCatalogs]);

	useEffect(() => {
		setColor(Colors.backgrounds.green);
		setOpacity(1);
		return () => {
			setOpacity(0.3);
		};
	}, [setColor, setOpacity]);

	const showProposal =
		!chunkLoading &&
		shouldShowProposal &&
		untrainedWords.length > 0 &&
		!proposalDismissed;

	const handleLearn = useCallback(async () => {
		await markProposed();
		const wordIds = untrainedWords.map((w) => w.remoteId).join(",");
		router.push({
			pathname: "/authorized/learning/word-intro" as never,
			params: { wordIds },
		});
	}, [markProposed, untrainedWords]);

	const handleTrainChunk = useCallback(async () => {
		await markProposed();
		if (!user?.userId || !user.language_learn) return;
		const allRecords = await learningRepository.getByUser(user.userId);
		const scopedWords = await wordsRepository.getRandomWords(
			user.language_learn,
			999999,
			[],
			currentCatalogs.length > 0 ? currentCatalogs : undefined,
			currentTopics.length > 0 ? currentTopics : undefined,
		);
		const scopedWordIds = new Set(scopedWords.map((w) => w.remoteId));
		const introducedIds = allRecords
			.filter((r) => r.training === "intro" && scopedWordIds.has(r.wordId))
			.map((r) => r.wordId);
		setChunkWordIds(introducedIds.length > 0 ? introducedIds : null);
		router.push({
			pathname: "/authorized/learning/mix-training",
			params:
				introducedIds.length > 0
					? { wordIds: introducedIds.join(",") }
					: undefined,
		});
	}, [
		currentCatalogs,
		currentTopics,
		markProposed,
		user?.language_learn,
		user?.userId,
		setChunkWordIds,
	]);

	const handleTrainAll = useCallback(async () => {
		await markProposed();
		setChunkWordIds(null);
		setProposalDismissed(true);
	}, [markProposed, setChunkWordIds]);

	if (showProposal) {
		return (
			<SafeAreaView mode="padding" edges={["top"]} style={styles.page}>
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

					<WCard
						style={{
							width: "100%",
							gap: 16,
							padding: 20,
							backgroundColor: Colors.dark.dark2,
						}}
					>
						<WText mode="primary" size="lg" weight="semibold" wrap>
							{t("daily_proposal_title", { count: untrainedWords.length })}
						</WText>
						<WText mode="secondary" size="sm" wrap>
							{t("daily_proposal_description")}
						</WText>
					</WCard>

					<WButton mode="primary" fullWidth onPress={handleLearn}>
						<WText mode="inverted">{t("daily_proposal_learn")}</WText>
					</WButton>

					<WButton mode="dark" fullWidth onPress={handleTrainChunk}>
						<WText>{t("daily_proposal_train_chunk")}</WText>
					</WButton>

					<WButton mode="dark" fullWidth onPress={handleTrainAll}>
						<WText>{t("daily_proposal_train_all")}</WText>
					</WButton>
				</View>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView mode="padding" edges={["top"]} style={styles.page}>
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

				<LearningCatalog
					onTrainingPress={(trainingId) => {
						setChunkWordIds(null);
						router.push({
							pathname: `/authorized/learning/${trainingId}`,
						});
					}}
				/>

				<WButton
					mode="primary"
					fullWidth
					onPress={() => {
						setChunkWordIds(null);
						router.push({ pathname: "/authorized/learning/mix-training" });
					}}
				>
					<WText mode="inverted">{t("mix_training_button")}</WText>
				</WButton>
			</View>
		</SafeAreaView>
	);
}
