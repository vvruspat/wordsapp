import AntDesign from "@expo/vector-icons/AntDesign";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Modal, Pressable, StyleSheet, View } from "react-native";
import { createReport } from "@/api/report";
import { WText } from "@/mob-ui";
import { Colors } from "@/mob-ui/brand/colors";

export type ReportButtonProps = {
	wordId: number;
};

type ReportType = "word" | "translation" | "audio";

export function ReportButton({ wordId }: ReportButtonProps) {
	const { t } = useTranslation();
	const [modalVisible, setModalVisible] = useState(false);

	const closeModal = useCallback(() => {
		setModalVisible(false);
	}, []);

	const submitReport = useCallback(
		async (type: ReportType) => {
			closeModal();
			const result = await createReport({ word: wordId, type });
			if (result.status === "success") {
				Alert.alert(t("report_success"));
			} else {
				Alert.alert(t("report_error"));
			}
		},
		[wordId, t, closeModal],
	);

	const handlePress = useCallback(() => {
		setModalVisible(true);
	}, []);

	const reportOptions: { label: string; type: ReportType }[] = [
		{ label: t("report_word"), type: "word" },
		{ label: t("report_translation"), type: "translation" },
		{ label: t("report_audio"), type: "audio" },
	];

	return (
		<>
			<Pressable style={styles.button} onPress={handlePress} hitSlop={8}>
				<AntDesign name="flag" size={16} color={Colors.greys.grey6} />
			</Pressable>
			<Modal
				visible={modalVisible}
				transparent
				animationType="fade"
				statusBarTranslucent
				onRequestClose={closeModal}
			>
				<View style={styles.overlay}>
					<Pressable style={styles.backdropPressable} onPress={closeModal} />
					<View style={styles.card}>
						<WText mode="primary" size="lg" weight="semibold" align="center">
							{t("report_button_title")}
						</WText>
						<View style={styles.options}>
							{reportOptions.map((option) => (
								<Pressable
									key={option.type}
									style={styles.optionButton}
									onPress={() => submitReport(option.type)}
								>
									<WText mode="primary" size="md" align="center" wrap>
										{option.label}
									</WText>
								</Pressable>
							))}
						</View>
						<Pressable style={styles.cancelButton} onPress={closeModal}>
							<WText mode="tertiary" size="md" weight="semibold" align="center">
								{t("report_cancel")}
							</WText>
						</Pressable>
					</View>
				</View>
			</Modal>
		</>
	);
}

const styles = StyleSheet.create({
	button: {
		padding: 8,
	},
	overlay: {
		flex: 1,
		backgroundColor: Colors.dark.black60,
		justifyContent: "center",
		alignItems: "center",
		padding: 24,
	},
	backdropPressable: {
		...StyleSheet.absoluteFillObject,
	},
	card: {
		width: "100%",
		maxWidth: 360,
		backgroundColor: Colors.greys.grey10,
		borderColor: Colors.greys.grey8,
		borderWidth: 1,
		borderRadius: 16,
		padding: 20,
		gap: 16,
		zIndex: 1,
		elevation: 1,
	},
	options: {
		gap: 8,
	},
	optionButton: {
		minHeight: 48,
		borderRadius: 12,
		backgroundColor: Colors.dark.dark3,
		justifyContent: "center",
		alignItems: "center",
		paddingHorizontal: 16,
		paddingVertical: 12,
	},
	cancelButton: {
		minHeight: 44,
		borderRadius: 12,
		justifyContent: "center",
		alignItems: "center",
		paddingHorizontal: 16,
		paddingVertical: 10,
	},
});
