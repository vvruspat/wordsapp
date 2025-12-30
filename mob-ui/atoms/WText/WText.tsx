import { typography } from "@/mob-ui/brand/typography";
import { StyleSheet, Text, TextProps } from "react-native";
import { styles } from "./WText.styles";

export type WTextProps = TextProps & {
	size?: keyof typeof typography.fontSize;
	mode?: "primary" | "secondary" | "tertiary";
	weight?: "bold" | "semibold" | "medium" | "regular" | "light" | "thin";
	align?: "left" | "center" | "right";
	wrap?: boolean;
	uppercase?: boolean;
};

export const WText = ({
	children,
	size = "md",
	mode = "primary",
	weight = "regular",
	align = "left",
	wrap = false,
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
					wrap && { textWrap: "wrap", whiteSpace: "wrap" },
				],
				style,
			)}
		>
			{children}
		</Text>
	);
};
