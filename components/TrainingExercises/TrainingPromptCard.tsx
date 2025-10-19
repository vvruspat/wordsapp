import { GlowingEllipse } from "@/components/GlowingEllipse";
import { WCard, WText, WZStack } from "@/mob-ui";
import { Colors } from "@/mob-ui/brand/colors";
import { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

export type TrainingPromptCardProps = {
	word?: string;
	transcribtion?: string;
	children?: ReactNode;
};

export function TrainingPromptCard({
	word,
	transcribtion,
	children,
}: TrainingPromptCardProps) {
	return (
		<WCard style={styles.container}>
			<WZStack style={styles.stack}>
				<GlowingEllipse />
				<View style={styles.translationContainer}>
					{(word || transcribtion) && (
						<View style={styles.wordContainer}>
							{word && (
								<WText mode="primary" weight="bold" size="3xl">
									{word}
								</WText>
							)}
							{transcribtion && (
								<WText mode="secondary" size="xl">
									{transcribtion}
								</WText>
							)}
						</View>
					)}

					{children}
				</View>
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
});

export const trainingPromptStyles = styles;
