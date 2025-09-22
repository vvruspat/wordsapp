import { useContext, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";
import { GlowingEllipse } from "@/components/GlowingEllipse";
import { PlayWordButton } from "@/components/PlayWordButton";
import { TrainingAppWrapper } from "@/components/TrainingAppWrapper";
import { BackgroundContext } from "@/context/BackgroundContext";
import { WButton, WCard, WText, WZStack } from "@/mob-ui";
import { Colors } from "@/mob-ui/brand/colors";

export default function ListeningPractice() {
	const { setColor, setOpacity } = useContext(BackgroundContext);

	const { t } = useTranslation();

	useEffect(() => {
		setColor(Colors.backgrounds.yellow);
		setOpacity(1);

		return () => {
			setOpacity(0.3);
		};
	}, [setColor, setOpacity]);

	return (
		<TrainingAppWrapper title={t("app_listening_practice_header")}>
			<WCard style={styles.container}>
				<WZStack style={{ overflow: "hidden" }}>
					<GlowingEllipse />
					<View style={[StyleSheet.absoluteFill, styles.translationContainer]}>
						<View style={styles.wordTranslationContainer}>
							<PlayWordButton autoplay />
						</View>
					</View>
				</WZStack>
			</WCard>

			<View style={styles.buttonsContainer}>
				{["Love", "World", "Death", "Robots"].map((option) => (
					<WButton key={option} mode="dark" fullWidth>
						<WText>{option}</WText>
					</WButton>
				))}
			</View>
		</TrainingAppWrapper>
	);
}

const styles = StyleSheet.create({
	container: {
		width: "100%",
		padding: 0,
		marginVertical: 32,
		backgroundColor: Colors.backgrounds.primaryBackground,
		flex: 1,
	},
	translationContainer: {
		padding: 24,
		justifyContent: "center",
		alignItems: "center",
		gap: 16,
	},
	wordContainer: {
		justifyContent: "center",
		alignItems: "center",
		gap: 16,
	},
	wordTranslationContainer: {
		justifyContent: "center",
		alignItems: "center",
		gap: 64,
	},
	buttonsContainer: {
		width: "100%",
		flexDirection: "column",
		justifyContent: "center",
		alignItems: "center",
		alignContent: "stretch",
		gap: 16,
	},
});
