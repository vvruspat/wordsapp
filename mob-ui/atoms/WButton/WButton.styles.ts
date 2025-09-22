import { StyleSheet } from "react-native";
import { Colors } from "@/mob-ui/brand/colors";
import { typography } from "@/mob-ui/brand/typography";

export const wButtonStyles = StyleSheet.create({
	container: {
		justifyContent: "center",
		paddingHorizontal: 36,
		paddingVertical: 18,
		borderRadius: 16,
		borderStyle: "solid",
		borderWidth: 1,
		alignItems: "center",
		fontSize: typography.fontSize.md,
		transitionDuration: "0.2s",
		transitionTimingFunction: "ease-in-out",
		transitionProperty: "opacity",
	},
	stretch: {
		flex: 1,
	},
	fullWidth: {
		width: "100%",
	},
	primary: {
		backgroundColor: Colors.primary.base,
		color: Colors.dark.black,
		borderColor: Colors.primary.base,
	},
	secondary: {
		backgroundColor: Colors.dark.dark3,
		color: Colors.greys.grey1,
		borderColor: Colors.greys.grey1,
	},
	tertiary: {
		backgroundColor: Colors.greys.white,
		color: Colors.dark.dark1,
		borderColor: Colors.dark.dark1,
	},
	red: {
		backgroundColor: Colors.accents.red,
		borderColor: Colors.accents.red,
		color: Colors.greys.white,
	},
	green: {
		backgroundColor: Colors.accents.green,
		borderColor: Colors.accents.green,
		color: Colors.greys.white,
	},
	purple: {
		backgroundColor: Colors.accents.purple,
		borderColor: Colors.accents.purple,
		color: Colors.greys.white,
	},
	dark: {
		backgroundColor: Colors.dark.black60,
		color: Colors.greys.white,
		borderColor: Colors.dark.dark4,
	},
	containerPressed: {
		opacity: 0.75,
	},
	text: {
		fontSize: typography.fontSize.md,
	},
});
