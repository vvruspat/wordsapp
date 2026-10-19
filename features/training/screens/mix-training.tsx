import { useMixedPreparation } from "../hooks/useMixedPreparation";
import { router } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { TrainingAppWrapper } from "@/features/training/components/TrainingAppWrapper";
import { WButton, WText } from "@/mob-ui";
import { Colors } from "@/mob-ui/brand/colors";

export default function MixTraining() {
	const { t, ready, hasWords, error, retry } = useMixedPreparation();

	if (!ready) {
		return (
			<View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
				<ActivityIndicator color={Colors.primary.base} size="large" />
			</View>
		);
	}

	if (error || !hasWords) {
		return (
			<View style={{ flex: 1, justifyContent: "center", gap: 16, padding: 24 }}>
				<WText mode="secondary" wrap>
					{t(error ? "mix_training_error" : "mix_training_no_words")}
				</WText>
				{error ? (
					<WButton mode="primary" fullWidth onPress={retry}>
						<WText mode="inverted">{t("button_retry")}</WText>
					</WButton>
				) : null}
				<WButton mode="dark" fullWidth onPress={() => router.back()}>
					<WText>{t("button_cancel")}</WText>
				</WButton>
			</View>
		);
	}

	return <TrainingAppWrapper excludedExercises={["cards"]} />;
}
