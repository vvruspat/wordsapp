import AntDesign from "@expo/vector-icons/AntDesign";
import { ReactNode, useCallback, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { GlowingEllipse } from "@/components/GlowingEllipse";
import { ReportButton } from "@/components/ReportButton";
import { SkipButton } from "@/components/SkipButton";
import { WCard, WText, WZStack } from "@/mob-ui";
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
	const [tooltipVisible, setTooltipVisible] = useState(false);

	const toggleTooltip = useCallback(() => setTooltipVisible((v) => !v), []);
	const dismissTooltip = useCallback(() => setTooltipVisible(false), []);

	return (
		<WCard style={styles.container}>
			<WZStack style={styles.stack}>
				<GlowingEllipse />
				{tooltipVisible && (
					<Pressable
						style={StyleSheet.absoluteFillObject}
						onPress={dismissTooltip}
					/>
				)}
				<View style={styles.translationContainer}>
					{(word || transcription) && (
						<View style={styles.wordContainer}>
							{word && (
								<View style={styles.wordRow}>
									<WText mode="primary" weight="bold" size="3xl">
										{word}
									</WText>
									{meaning && (
										<Pressable
											onPress={toggleTooltip}
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
							{tooltipVisible && meaning && (
								<View style={styles.tooltip}>
									<WText size="sm" mode="secondary" wrap>
										{meaning}
									</WText>
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
	infoButton: {
		padding: 4,
	},
	tooltip: {
		backgroundColor: Colors.dark.dark3,
		borderRadius: 8,
		paddingHorizontal: 12,
		paddingVertical: 8,
		maxWidth: 220,
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
});

export const trainingPromptStyles = styles;
