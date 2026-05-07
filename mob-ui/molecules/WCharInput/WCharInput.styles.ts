import { StyleSheet } from "react-native";
import { typography } from "@/mob-ui/brand/typography";

const INPUT_ROW_SIZE = 56;
const INPUT_ROW_SMALL_SIZE = 32;
export const inputCellMetrics = {
	default: {
		fontSize: 32,
		lineHeight: 38,
	},
	small: {
		fontSize: 17,
		lineHeight: 20,
	},
} as const;

export const styles = StyleSheet.create({
	input: {
		width: 0,
		height: 0,
		position: "absolute",
		opacity: 0,
		pointerEvents: "none",
	},
	inputRow: {
		width: INPUT_ROW_SIZE,
		paddingHorizontal: 0,
		paddingLeft: 0,
		paddingRight: 0,
		alignItems: "center",
		justifyContent: "center",
	},
	inputRowSmall: {
		width: INPUT_ROW_SMALL_SIZE,
		height: INPUT_ROW_SMALL_SIZE,
		borderRadius: 8,
	},
	inputTextBase: {
		color: "white",
		textAlign: "center",
		includeFontPadding: false,
		fontFamily: typography.fontFamily.heading,
		fontWeight: "700",
	},
	inputText: {
		lineHeight: inputCellMetrics.default.lineHeight,
		fontSize: inputCellMetrics.default.fontSize,
	},
	inputTextSmall: {
		lineHeight: inputCellMetrics.small.lineHeight,
		fontSize: inputCellMetrics.small.fontSize,
	},
	inputTextUppercase: {
		textTransform: "uppercase",
	},
});
