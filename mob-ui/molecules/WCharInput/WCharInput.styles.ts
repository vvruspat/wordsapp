import { StyleSheet } from "react-native";
import { typography } from "@/mob-ui/brand/typography";

const INPUT_ROW_SIZE = 56;
const INPUT_ROW_SMALL_SIZE = 32;
const INPUT_TEXT_VERTICAL_INSET = 4;
const INPUT_TEXT_SMALL_VERTICAL_INSET = 2;

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
		alignItems: "center",
		justifyContent: "center",
	},
	inputRowSmall: {
		width: INPUT_ROW_SMALL_SIZE,
		height: INPUT_ROW_SMALL_SIZE,
		borderRadius: 8,
	},
	inputText: {
		height: INPUT_ROW_SIZE - INPUT_TEXT_VERTICAL_INSET * 2,
		lineHeight: INPUT_ROW_SIZE - INPUT_TEXT_VERTICAL_INSET * 2,
		textAlign: "center",
		includeFontPadding: false,
	},
	inputTextSmall: {
		height: INPUT_ROW_SMALL_SIZE - INPUT_TEXT_SMALL_VERTICAL_INSET * 2,
		lineHeight: INPUT_ROW_SMALL_SIZE - INPUT_TEXT_SMALL_VERTICAL_INSET * 2,
		textAlign: "center",
		includeFontPadding: false,
		fontSize: typography.fontSize.xl,
	},
});
