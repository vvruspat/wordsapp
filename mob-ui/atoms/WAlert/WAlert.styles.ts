import { StyleSheet } from "react-native";
import { Colors } from "@/mob-ui/brand/colors";

export const styles = StyleSheet.create({
	container: {
		flexDirection: "row",
		alignItems: "flex-start",
		borderRadius: 12,
		borderWidth: 1,
		paddingHorizontal: 16,
		paddingVertical: 12,
		gap: 10,
		width: "100%",
	},

	containerError: {
		borderColor: Colors.accents.red,
		backgroundColor: "rgba(213, 67, 52, 0.12)",
	},
	containerSuccess: {
		borderColor: Colors.accents.green,
		backgroundColor: "rgba(61, 160, 0, 0.12)",
	},
	containerWarning: {
		borderColor: Colors.accents.orange,
		backgroundColor: "rgba(250, 142, 62, 0.12)",
	},
	containerInfo: {
		borderColor: Colors.accents.blue,
		backgroundColor: "rgba(143, 218, 255, 0.12)",
	},

	text: {
		flex: 1,
	},

	textError: {
		color: Colors.accents.red,
	},
	textSuccess: {
		color: Colors.accents.green,
	},
	textWarning: {
		color: Colors.accents.orange,
	},
	textInfo: {
		color: Colors.accents.blue,
	},
});
