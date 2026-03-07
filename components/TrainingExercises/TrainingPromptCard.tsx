import AntDesign from "@expo/vector-icons/AntDesign";
import { ReactNode, useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { GlowingEllipse } from "@/components/GlowingEllipse";
import { ReportButton } from "@/components/ReportButton";
import { SkipButton } from "@/components/SkipButton";
import { WButton, WCard, WText, WZStack } from "@/mob-ui";
import { Colors } from "@/mob-ui/brand/colors";

export type TrainingPromptCardProps = {
	word?: string;
	transcription?: string;
	meaning?: string;
	wordId?: number;
	onSkip?: () => void;
	children?: ReactNode;
};

export function TrainingPromptCard({
	word,
	transcription,
	meaning,
	wordId,
	onSkip,
	children,
}: TrainingPromptCardProps) {
	const { t } = useTranslation();
	const [modalVisible, setModalVisible] = useState(false);

	const openModal = useCallback(() => setModalVisible(true), []);
	const closeModal = useCallback(() => setModalVisible(false), []);

	return (
		<>
			<WCard style={styles.container}>
				<WZStack style={styles.stack}>
					<GlowingEllipse />
					<View style={styles.translationContainer}>
						{(word || transcription) && (
							<View style={styles.wordContainer}>
								{word && (
									<View style={styles.wordRow}>
										{meaning && <View style={styles.infoButtonSpacer} />}
										<WText mode="primary" weight="bold" size="3xl">
											{word}
										</WText>
										{meaning && (
											<Pressable
												onPress={openModal}
												style={styles.infoButton}
												hitSlop={8}
											>
												<AntDesign
													name="info-circle"
													size={18}
													color={Colors.greys.grey5}
												/>
											</Pressable>
										)}
									</View>
								)}
								{transcription && (
									<WText mode="secondary" size="xl">
										{transcription}
									</WText>
								)}
							</View>
						)}

						{children}
					</View>
					{onSkip && (
						<View style={styles.skipButton}>
							<SkipButton onPress={onSkip} />
						</View>
					)}
					{wordId !== undefined && (
						<View style={styles.reportButton}>
							<ReportButton wordId={wordId} />
						</View>
					)}
				</WZStack>
			</WCard>

			{meaning && (
				<Modal
					visible={modalVisible}
					transparent
					animationType="slide"
					onRequestClose={closeModal}
				>
					<View style={styles.modalOverlay}>
						<Pressable style={styles.modalBackdrop} onPress={closeModal} />
						<WCard style={styles.modalCard}>
							<WText mode="primary" size="lg" weight="semibold" wrap>
								{meaning}
							</WText>
							<WButton mode="primary" fullWidth onPress={closeModal}>
								<WText mode="inverted">{t("button_continue")}</WText>
							</WButton>
						</WCard>
					</View>
				</Modal>
			)}
		</>
	);
}

const INFO_BUTTON_WIDTH = 26; // icon 18px + padding 4px * 2

const styles = StyleSheet.create({
	container: {
		width: "100%",
		padding: 0,
		marginVertical: 32,
		backgroundColor: Colors.backgrounds.primaryBackground,
		flex: 1,
	},
	stack: {
		overflow: "hidden",
	},
	translationContainer: {
		...StyleSheet.absoluteFillObject,
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
	wordRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},
	infoButtonSpacer: {
		width: INFO_BUTTON_WIDTH,
	},
	infoButton: {
		width: INFO_BUTTON_WIDTH,
		padding: 4,
		alignItems: "center",
	},
	wordTranslationContainer: {
		justifyContent: "center",
		alignItems: "center",
		gap: 64,
	},
	skipButton: {
		position: "absolute",
		top: 4,
		left: 4,
	},
	reportButton: {
		position: "absolute",
		top: 4,
		right: 4,
	},
	modalOverlay: {
		flex: 1,
		flexDirection: "column",
		justifyContent: "flex-end",
		backgroundColor: Colors.dark.black60,
	},
	modalBackdrop: {
		flex: 1,
	},
	modalCard: {
		flex: 0,
		gap: 24,
		borderColor: Colors.greys.grey9,
		borderWidth: 1,
		borderBottomWidth: 0,
		paddingBottom: 48,
	},
});

export const trainingPromptStyles = styles;
