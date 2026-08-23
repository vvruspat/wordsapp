import { Text } from "react-native";
import { Colors } from "@/mob-ui/brand/colors";

const WORD_PATTERN = /^[\p{L}\p{M}]+(?:['’-][\p{L}\p{M}]+)*$/u;
const SPLIT_PATTERN = /([\p{L}\p{M}]+(?:['’-][\p{L}\p{M}]+)*)/gu;

export const TappableText = ({
	text,
	onWordPress,
	color = Colors.greys.white,
	fontSize = 17,
	align = "left",
}: {
	text: string;
	onWordPress?: (word: string) => void;
	color?: string;
	fontSize?: number;
	align?: "left" | "right" | "center";
}) => (
	<Text
		style={{
			color,
			fontSize,
			lineHeight: Math.round(fontSize * 1.45),
			textAlign: align,
		}}
	>
		{onWordPress
			? text.split(SPLIT_PATTERN).map((part, index) =>
				WORD_PATTERN.test(part) ? (
				<Text
					// biome-ignore lint/suspicious/noArrayIndexKey: token positions are stable within immutable message text
					key={`${part}-${index}`}
					onPress={() => onWordPress(part)}
					style={{ textDecorationLine: "underline", textDecorationStyle: "dotted" }}
				>
					{part}
				</Text>
				) : (
					part
				),
			)
			: text}
	</Text>
);
