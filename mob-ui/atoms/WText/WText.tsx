import {
	Platform,
	StyleSheet,
	Text,
	TextProps,
	type TextStyle,
} from "react-native";
import { typography } from "@/mob-ui/brand/typography";
import { styles } from "./WText.styles";

export type WTextProps = TextProps & {
	size?: keyof typeof typography.fontSize;
	mode?: "primary" | "secondary" | "tertiary" | "inverted";
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
	wrap = true,
	uppercase,
	style,
	...rest
}: WTextProps) => {
	const layoutStyle: TextStyle & { whiteSpace?: "normal" | "nowrap" } = {
		textAlign: align,
		...(Platform.OS === "web"
			? { whiteSpace: wrap ? "normal" : "nowrap" }
			: {}),
	};
	return (
		<Text
			{...rest}
			allowFontScaling={false}
			style={StyleSheet.compose(
				[
					styles.text,
					styles[`${mode}`],
					styles[`${weight}`],
					layoutStyle,
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
