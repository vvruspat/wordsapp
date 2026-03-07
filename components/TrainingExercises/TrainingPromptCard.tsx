import { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { GlowingEllipse } from "@/components/GlowingEllipse";
import { ReportButton } from "@/components/ReportButton";
import { SkipButton } from "@/components/SkipButton";
import { WCard, WText, WZStack } from "@/mob-ui";
import { Colors } from "@/mob-ui/brand/colors";

export type TrainingPromptCardProps = {
	word?: string;
	transcription?: string;
	wordId?: number;
	onSkip?: () => void;
	children?: ReactNode;
};

export function TrainingPromptCard({
	word,
	transcription,
	wordId,
	onSkip,
	children,
}: TrainingPromptCardProps) {
	return (
		<WCard style={styles.container}>
			<WZStack style={styles.stack}>
				<GlowingEllipse />
				<View style={styles.translationContainer}>
					{(word || transcription) && (
						<View style={styles.wordContainer}>
							{word && (
								<WText mode="primary" weight="bold" size="3xl">
									{word}
								</WText>
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
