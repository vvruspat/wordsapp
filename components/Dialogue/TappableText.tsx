import { Text } from "react-native";
import { Colors } from "@/mob-ui/brand/colors";

const WORD_PATTERN = /^[\p{L}\p{M}]+(?:['’-][\p{L}\p{M}]+)*$/u;
const SPLIT_PATTERN = /([\p{L}\p{M}]+(?:['’-][\p{L}\p{M}]+)*)/gu;

export const TappableText = ({
	text,
	onWordPress,
	highlightedWords = [],
	color = Colors.greys.white,
	fontSize = 17,
	align = "left",
}: {
	text: string;
	onWordPress?: (word: string) => void;
	highlightedWords?: readonly string[];
	color?: string;
	fontSize?: number;
	align?: "left" | "right" | "center";
}) => {
	const normalizedHighlights = new Set(
		highlightedWords.flatMap((value) =>
			(value.match(SPLIT_PATTERN) ?? []).map((word) =>
				word.normalize("NFKC").toLocaleLowerCase(),
			),
		),
	);

	return (
		<Text
			style={{
				color,
				fontSize,
				lineHeight: Math.round(fontSize * 1.45),
				textAlign: align,
			}}
		>
			{onWordPress
				? text.split(SPLIT_PATTERN).map((part, index) => {
						if (!WORD_PATTERN.test(part)) return part;
						const highlighted = normalizedHighlights.has(
							part.normalize("NFKC").toLocaleLowerCase(),
						);
						return (
							<Text
								// biome-ignore lint/suspicious/noArrayIndexKey: token positions are stable within immutable message text
								key={`${part}-${index}`}
								onPress={() => onWordPress(part)}
								style={
									highlighted
										? {
												textDecorationLine: "underline",
												textDecorationStyle: "dotted",
												textDecorationColor: Colors.primary.base,
											}
										: undefined
								}
							>
								{part}
							</Text>
						);
					})
				: text}
		</Text>
	);
};
