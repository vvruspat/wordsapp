import { LearningCatalog } from "@/components/LearningCatalog";
import { BackgroundContext } from "@/context/BackgroundContext";
import { WButton, WText } from "@/mob-ui";
import { Colors } from "@/mob-ui/brand/colors";
import { router } from "expo-router";
import { useContext, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { styles } from "../../../general.styles";

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
					onPress={() =>
						router.push({ pathname: "/authorized/learning/mix-training" })
					}
				>
					<Text>{t("mix_training_button")}</Text>
				</WButton>
			</View>
		</SafeAreaView>
	);
}
