import { StyleSheet } from "react-native";
import { Colors } from "@/mob-ui/brand/colors";

export const trainingAppWrapperStyles = StyleSheet.create({
	headerRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		width: "100%",
		maxWidth: "100%",
		gap: 16,
	},
	title: {
		flex: 1,
		color: Colors.greys.white,
		overflow: "hidden",
	},
	closeLink: {
		flex: 0,
		padding: 8,
		borderRadius: 16,
		overflow: "hidden",
		height: 32,
		width: 32,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: Colors.dark.black,
	},
	masteredPromptOverlay: {
		position: "absolute",
		right: 16,
		bottom: 24,
		left: 16,
	},
	masteredPromptCard: {
		backgroundColor: Colors.dark.dark2,
		borderWidth: 1,
		borderColor: Colors.greys.grey4,
		gap: 16,
	},
	masteredPromptTitle: {
		color: Colors.greys.white,
	},
	masteredPromptDescription: {
		color: Colors.greys.grey2,
	},
	masteredPromptActions: {
		gap: 12,
		width: "100%",
	},
});
