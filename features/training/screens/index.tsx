import { useLearning } from "../hooks/useLearning";
import { router } from "expo-router";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LearningCatalog } from "@/features/training/components/LearningCatalog";
import { WButton, WCard, WText } from "@/mob-ui";
import { Colors } from "@/mob-ui/brand/colors";
import { styles } from "@/general.styles";

export default function Learning() {
	const {
		t,
		setChunkWordIds,
		untrainedWords,
		showProposal,
		handleLearn,
		handleTrainChunk,
		handleTrainAll,
	} = useLearning();

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
					onTrainingPress={(trainingId) =>
						router.push({
							pathname: `/authorized/learning/${trainingId}`,
						})
					}
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
