import { Colors } from "@/mob-ui/brand/colors";
import { StyleSheet } from "react-native";

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
});
