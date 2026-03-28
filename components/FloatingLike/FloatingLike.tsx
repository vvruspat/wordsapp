import AntDesign from "@expo/vector-icons/AntDesign";
import { useEffect, useState } from "react";
import { StyleSheet } from "react-native";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { Colors } from "@/mob-ui/brand/colors";

type Props = {
	/** Increment to fire a new animation; 0 = idle */
	trigger: number;
};

export function FloatingLike({ trigger }: Props) {
	const [animating, setAnimating] = useState(false);
	const translateY = useSharedValue(0);
	const opacity = useSharedValue(0);

	useEffect(() => {
		if (trigger === 0) return;

		setAnimating(true);
		translateY.value = 0;
		opacity.value = withTiming(1, { duration: 300 });
		translateY.value = withTiming(-160, { duration: 1200 });

		const fadeTimer = setTimeout(() => {
			opacity.value = withTiming(0, { duration: 400 });
		}, 800);

		const hideTimer = setTimeout(() => {
			setAnimating(false);
		}, 1200);

		return () => {
			clearTimeout(fadeTimer);
			clearTimeout(hideTimer);
		};
	}, [trigger, translateY, opacity]);

	const style = useAnimatedStyle(() => ({
		transform: [{ translateY: translateY.value }],
		opacity: opacity.value,
	}));

	if (!animating) return null;

	return (
		<Animated.View style={[styles.container, style]} pointerEvents="none">
			<AntDesign name="like" size={72} color={Colors.accents.green} style={styles.icon} />
		</Animated.View>
	);
}

const styles = StyleSheet.create({
	container: {
		position: "absolute",
		right: 24,
		bottom: "35%",
		zIndex: 10,
	},
	icon: {
		shadowColor: Colors.accents.green,
		shadowOpacity: 0.8,
		shadowRadius: 20,
		shadowOffset: { width: 0, height: 0 },
	},
});
