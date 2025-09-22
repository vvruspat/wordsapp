import { useEffect, useMemo } from "react";
import Animated, { useSharedValue, withSpring } from "react-native-reanimated";
import { WButton, WText } from "@/mob-ui";

export type MatchWordCardProps = {
	text: string;
	onPress: () => void;
	state?: "default" | "selected" | "correct" | "incorrect";
};

export const MatchWordCard = ({
	text,
	onPress,
	state = "default",
}: MatchWordCardProps) => {
	const opacity = useSharedValue(1);

	const status = useMemo(() => {
		if (state === "selected") return "purple";
		if (state === "correct") return "green";
		if (state === "incorrect") return "red";
		return "dark";
	}, [state]);

	useEffect(() => {
		if (state === "correct") opacity.value = withSpring(0);
		else opacity.value = withSpring(1);
	}, [state, opacity]);

	return (
		<Animated.View style={{ flex: 1, opacity: opacity }}>
			<WButton
				mode={status}
				stretch
				style={{
					flex: 1,
					justifyContent: "center",
					alignItems: "center",
				}}
				onPress={onPress}
			>
				<WText mode="primary" size="xl">
					{text}
				</WText>
			</WButton>
		</Animated.View>
	);
};
