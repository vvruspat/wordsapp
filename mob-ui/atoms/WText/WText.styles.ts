import { StyleSheet } from "react-native";
import { Colors } from "@/mob-ui/brand/colors";
import { typography } from "@/mob-ui/brand/typography";

export const styles = StyleSheet.create({
	text: {
		fontFamily: typography.fontFamily.body,
	},

	primary: {
		color: Colors.greys.white,
	},
	secondary: {
		color: Colors.greys.grey5,
	},
	tertiary: {
		color: Colors.greys.grey6,
	},

	bold: {
		fontWeight: "bold",
	},
	semibold: {
		fontWeight: "600",
	},
	medium: {
		fontWeight: "500",
	},
	regular: {
		fontWeight: "400",
	},
	light: {
		fontWeight: "300",
	},
	thin: {
		fontWeight: "200",
	},
});
