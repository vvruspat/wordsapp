import { useCallback, useEffect, useRef } from "react";
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
	const phase = useRef<"idle" | "exiting" | "waiting" | "entering">("idle");
	const contentReady = useRef(false);
	const animation = useRef<Animated.CompositeAnimation | null>(null);
	const mounted = useRef(true);

	const setPosition = useCallback(
		(value: number) => {
			translateX.setValue(value);
			for (const anim of buttonAnims) anim.setValue(value);
		},
		[translateX, buttonAnims],
	);

	useEffect(() => {
		mounted.current = true;
		return () => {
			mounted.current = false;
			const previous = animation.current;
			animation.current = null;
			phase.current = "idle";
			contentReady.current = false;
			previous?.stop();
		};
	}, []);

	const swipeIn = useCallback(() => {
		if (!mounted.current || phase.current !== "waiting") return;
		phase.current = "entering";
		contentReady.current = false;
		const next = Animated.stagger(BUTTON_STAGGER, [
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
		]);
		animation.current = next;
		next.start(() => {
			if (!mounted.current || animation.current !== next) return;
			animation.current = null;
			// Native cancellation also calls start's callback. Settle visibly even
			// when the entrance was interrupted before it reached zero.
			setPosition(0);
			phase.current = "idle";
		});
	}, [translateX, buttonAnims, setPosition]);

	const swipeOut = useCallback(
		(afterSwipeOut: () => void) => {
			if (
				!mounted.current ||
				phase.current === "exiting" ||
				phase.current === "waiting"
			)
				return;
			// A fast answer to the new task may arrive during its entrance.
			// Invalidate that callback before stopping it so it cannot reset
			// the next exit or consume its content notification.
			const previous = animation.current;
			animation.current = null;
			previous?.stop();
			phase.current = "exiting";
			contentReady.current = false;
			const next = Animated.parallel([
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
			]);
			animation.current = next;
			next.start(() => {
				if (!mounted.current || animation.current !== next) return;
				animation.current = null;
				phase.current = "waiting";
				setPosition(width);
				// The answer is already accepted; advance once even if the native
				// exit was interrupted. Unmounted/stale callbacks never advance.
				afterSwipeOut();
				if (contentReady.current) swipeIn();
			});
		},
		[translateX, buttonAnims, width, setPosition, swipeIn],
	);

	// Call when new content is ready. No-op on initial load.
	const notifyContentChanged = useCallback(() => {
		if (phase.current === "exiting") contentReady.current = true;
		else swipeIn();
	}, [swipeIn]);

	return { translateX, buttonAnims, swipeOut, notifyContentChanged };
}
