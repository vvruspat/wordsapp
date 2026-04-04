import { useCallback, useRef } from "react";
import { Animated, Easing, useWindowDimensions } from "react-native";

const CARD_DURATION = 200;
const BUTTON_DURATION = 180;
const BUTTON_STAGGER = 55;
const OUT_DURATION = 200;

export function useSwipeAnimation(buttonCount = 0) {
	const { width } = useWindowDimensions();
	const translateX = useRef(new Animated.Value(0)).current;
	const buttonAnims = useRef(
		Array.from({ length: buttonCount }, () => new Animated.Value(0)),
	).current;
	const waitingForContent = useRef(false);

	const swipeOut = useCallback(
		(afterSwipeOut: () => void) => {
			Animated.parallel([
				Animated.timing(translateX, {
					toValue: -width,
					duration: OUT_DURATION,
					useNativeDriver: true,
					easing: Easing.in(Easing.ease),
				}),
				...buttonAnims.map((anim) =>
					Animated.timing(anim, {
						toValue: -width,
						duration: OUT_DURATION,
						useNativeDriver: true,
						easing: Easing.in(Easing.ease),
					}),
				),
			]).start(() => {
				waitingForContent.current = true;
				translateX.setValue(width);
				for (const anim of buttonAnims) {
					anim.setValue(width);
				}
				afterSwipeOut();
			});
		},
		[translateX, buttonAnims, width],
	);

	// Call when new content is ready. No-op on initial load.
	const notifyContentChanged = useCallback(() => {
		if (!waitingForContent.current) return;
		waitingForContent.current = false;

		// Card slides in first, then buttons cascade one by one
		Animated.stagger(BUTTON_STAGGER, [
			Animated.timing(translateX, {
				toValue: 0,
				duration: CARD_DURATION,
				useNativeDriver: true,
				easing: Easing.out(Easing.ease),
			}),
			...buttonAnims.map((anim) =>
				Animated.timing(anim, {
					toValue: 0,
					duration: BUTTON_DURATION,
					useNativeDriver: true,
					easing: Easing.out(Easing.ease),
				}),
			),
		]).start();
	}, [translateX, buttonAnims]);

	return { translateX, buttonAnims, swipeOut, notifyContentChanged };
}
