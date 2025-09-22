import { StyleSheet } from "react-native";
import { Colors } from "@/mob-ui/brand/colors";
import { typography } from "@/mob-ui/brand/typography";
import { styles as wTextStyles } from "../WText/WText.styles";

export const styles = StyleSheet.create({
	wrapper: {},
	fullWidth: {
		width: "100%",
	},
	label: {
		marginBottom: 6,
		color: Colors.greys.grey5,
		fontSize: typography.fontSize.sm,
	},
	inputRow: {
		color: Colors.greys.grey3,
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: Colors.transparent,
		borderColor: Colors.greys.grey8,
		borderWidth: 1,
		borderRadius: 16,
		paddingHorizontal: 18,
		paddingVertical: 0,
		shadowOffset: { width: 0, height: 0 },
		height: 56,
	},

	inputRowPlaceholder: {
		color: Colors.greys.whiteAlpha60,
	},

	inputRowDefault: {
		borderColor: Colors.greys.grey3,
		shadowColor: Colors.greys.grey3,
	},
	inputRowError: {
		borderColor: Colors.accents.red,
		shadowColor: Colors.accents.red,
	},
	inputRowSuccess: {
		borderColor: Colors.primary.base,
		shadowColor: Colors.primary.base,
	},

	left: {
		marginRight: 8,
	},
	right: {
		marginLeft: 8,
	},
	input: {
		flex: 1,
		fontSize: typography.fontSize.md,
		color: Colors.greys.grey3,
		alignContent: "center",
		textAlignVertical: "center",
		padding: 0,
		/** web only */
		outlineWidth: 0,
	},

	actionButton: {
		paddingHorizontal: 8,
		paddingVertical: 0,
		justifyContent: "center",
		alignItems: "center",
	},

	description: {
		marginTop: 6,
	},
	descriptionDefault: {
		color: Colors.greys.grey5,
	},
	descriptionError: {
		color: Colors.accents.red,
	},
	descriptionSuccess: {
		color: Colors.primary.base,
	},

	...wTextStyles,
});
