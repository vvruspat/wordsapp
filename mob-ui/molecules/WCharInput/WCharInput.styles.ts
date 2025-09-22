import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
	input: {
		width: 0,
		height: 0,
		position: "absolute",
		opacity: 0,
		pointerEvents: "none",
	},
	inputRow: {
		width: 56,
		paddingHorizontal: 0,
		alignItems: "center",
		justifyContent: "center",
	},
});
