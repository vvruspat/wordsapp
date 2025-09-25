import { Colors } from "@/mob-ui/brand/colors";
import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
	screen: {
		backgroundColor: Colors.backgrounds.primaryBackground,
	},
	page: {
		flex: 1,
		justifyContent: "flex-start",
		paddingHorizontal: 16,
		alignItems: "flex-start",
		marginTop: 16,
	},

	formWrapper: {
		flex: 1,
		gap: 48,
		width: "100%",
		alignItems: "center",
		justifyContent: "center",
	},

	fieldsGroup: {
		gap: 24,
		width: "100%",
	},

	spinnerContainer: {
		flex: 1,
		justifyContent: "center",
	},
});
