import { StyleSheet, Text, TextProps } from "react-native";
import { typography } from "@/mob-ui/brand/typography";
import { styles } from "./WText.styles";

export type WTextProps = TextProps & {
	size?: keyof typeof typography.fontSize;
	mode?: "primary" | "secondary" | "tertiary";
	weight?: "bold" | "semibold" | "medium" | "regular" | "light" | "thin";
	align?: "left" | "center" | "right";
	uppercase?: boolean;
};

export const WText = ({
	children,
	size = "md",
	mode = "primary",
	weight = "regular",
	align = "left",
	uppercase,
	style,
	...rest
}: WTextProps) => {
	return (
		<Text
			{...rest}
			style={StyleSheet.compose(
				[
					styles.text,
					styles[`${mode}`],
					styles[`${weight}`],
					{ textAlign: align },
					{ fontSize: typography.fontSize[size] },
					uppercase && { textTransform: "uppercase" },
				],
				style,
			)}
		>
			{children}
		</Text>
	);
};
