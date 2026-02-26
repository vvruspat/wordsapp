import AntDesign from "@expo/vector-icons/AntDesign";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Pressable, StyleSheet } from "react-native";
import { createReport } from "@/api/report";
import { Colors } from "@/mob-ui/brand/colors";

export type ReportButtonProps = {
	wordId: number;
};

export function ReportButton({ wordId }: ReportButtonProps) {
	const { t } = useTranslation();

	const submitReport = useCallback(
		async (type: "word" | "translation" | "audio") => {
			const result = await createReport({ word: wordId, type });
			if (result.status === "success") {
				Alert.alert(t("report_success"));
			} else {
				Alert.alert(t("report_error"));
			}
		},
		[wordId, t],
	);

	const handlePress = useCallback(() => {
		Alert.alert(t("report_button_title"), undefined, [
			{
				text: t("report_word"),
				onPress: () => submitReport("word"),
			},
			{
				text: t("report_translation"),
				onPress: () => submitReport("translation"),
			},
			{
				text: t("report_audio"),
				onPress: () => submitReport("audio"),
			},
			{
				text: t("report_cancel"),
				style: "cancel",
			},
		]);
	}, [t, submitReport]);

	return (
		<Pressable style={styles.button} onPress={handlePress}>
			<AntDesign name="flag" size={16} color={Colors.greys.grey6} />
		</Pressable>
	);
}

const styles = StyleSheet.create({
	button: {
		padding: 8,
	},
});
