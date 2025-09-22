import { useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";
import { GlowingEllipse } from "@/components/GlowingEllipse";
import { PlayWordButton } from "@/components/PlayWordButton";
import { TrainingAppWrapper } from "@/components/TrainingAppWrapper";
import { BackgroundContext } from "@/context/BackgroundContext";
import { WCard, WCharInput, WCharInputProps, WText, WZStack } from "@/mob-ui";
import { Colors } from "@/mob-ui/brand/colors";

const answer = "World";

export default function TypeTranslation() {
	const { setColor, setOpacity } = useContext(BackgroundContext);
	const [status, setStatus] = useState<WCharInputProps["status"]>("default");
	const { t } = useTranslation();

	useEffect(() => {
		setColor(Colors.backgrounds.blue);
		setOpacity(1);

		return () => {
			setOpacity(0.3);
		};
	}, [setColor, setOpacity]);

	const handleAnswerChange = (text: string) => {
		if (
			text.length === answer.length &&
			text.toLowerCase() === answer.toLowerCase()
		) {
			setStatus("success");
		} else if (text.length === answer.length) {
			setStatus("error");
		} else {
			if (answer.toLowerCase().startsWith(text.toLowerCase())) {
				setStatus("default");
			} else {
				setStatus("error");
			}
		}
	};

	return (
		<TrainingAppWrapper title={t("app_type_translation_header")}>
			<WCard style={styles.container}>
				<WZStack style={{ overflow: "hidden" }}>
					<GlowingEllipse />
					<View style={[StyleSheet.absoluteFill, styles.translationContainer]}>
						<View style={styles.wordContainer}>
							<WText mode="primary" weight="bold" size="3xl">
								{t("type_translation_word")}
							</WText>
							<WText mode="secondary" size="xl">
								{t("type_translation_transliteration")}
							</WText>
						</View>
						<View style={styles.wordTranslationContainer}>
							<PlayWordButton />
						</View>
					</View>
				</WZStack>
			</WCard>

			<View style={styles.buttonsContainer}>
				<WCharInput
					length={answer.length}
					onChangeText={handleAnswerChange}
					status={status}
				/>
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
