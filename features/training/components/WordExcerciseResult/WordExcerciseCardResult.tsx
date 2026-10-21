import { WButton, WCard, WText } from "@/mob-ui/atoms";
import { Colors } from "@/mob-ui/brand/colors";
import { getBiggestWordLength } from "@/utils/getBiggestWordLength";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
	Animated,
	Easing,
	Modal,
	type ModalProps,
	StyleSheet,
	View,
} from "react-native";

const SLIDE_DISTANCE = 500;
const FADE_DURATION = 250;
const SLIDE_DURATION = 320;

export type WordExcerciseCardResultModalProps = Omit<
	ModalProps,
	"onRequestClose"
> & {
	onRequestClose?: () => void;
	word?: string;
	translation?: string;
};

export const WordExcerciseCardResultModal = ({
	onRequestClose,
	visible,
	word,
	translation,
	...modalProps
}: WordExcerciseCardResultModalProps) => {
	const { t } = useTranslation();

	const [internalVisible, setInternalVisible] = useState(false);
	const overlayOpacity = useRef(new Animated.Value(0)).current;
	const cardTranslateY = useRef(new Animated.Value(SLIDE_DISTANCE)).current;
	const closeRequested = useRef(false);
	const requestClose = useCallback(() => {
		if (!visible || closeRequested.current) return;
		closeRequested.current = true;
		onRequestClose?.();
	}, [visible, onRequestClose]);

	useEffect(() => {
		let active = true;
		let animation: Animated.CompositeAnimation;
		if (visible) {
			closeRequested.current = false;
			overlayOpacity.setValue(0);
			cardTranslateY.setValue(SLIDE_DISTANCE);
			setInternalVisible(true);
			animation = Animated.parallel([
				Animated.timing(overlayOpacity, {
					toValue: 1,
					duration: FADE_DURATION,
					useNativeDriver: true,
					easing: Easing.out(Easing.ease),
				}),
				Animated.timing(cardTranslateY, {
					toValue: 0,
					duration: SLIDE_DURATION,
					useNativeDriver: true,
					easing: Easing.out(Easing.ease),
				}),
			]);
			animation.start();
		} else {
			animation = Animated.parallel([
				Animated.timing(overlayOpacity, {
					toValue: 0,
					duration: FADE_DURATION,
					useNativeDriver: true,
					easing: Easing.in(Easing.ease),
				}),
				Animated.timing(cardTranslateY, {
					toValue: SLIDE_DISTANCE,
					duration: SLIDE_DURATION,
					useNativeDriver: true,
					easing: Easing.in(Easing.ease),
				}),
			]);
			animation.start(({ finished }) => {
				if (active && finished) setInternalVisible(false);
			});
		}
		return () => {
			active = false;
			animation.stop();
		};
	}, [visible, overlayOpacity, cardTranslateY]);

	const wordLength = getBiggestWordLength(word || "");
	const translationLength = getBiggestWordLength(translation || "");
	const maxLength = Math.max(wordLength, translationLength);

	const fontSize = useMemo(() => {
		if (maxLength <= 10) return "xl";
		if (maxLength <= 14) return "lg";
		if (maxLength <= 18) return "md";
		return "sm";
	}, [maxLength]);

	return (
		<Modal
			transparent
			animationType="none"
			statusBarTranslucent
			visible={internalVisible}
			onRequestClose={requestClose}
			{...modalProps}
		>
			{/* Overlay — fade only */}
			<Animated.View
				style={[styles.overlay, { opacity: overlayOpacity }]}
				pointerEvents="none"
			/>

			{/* Card — slides from bottom */}
			<View style={styles.layout}>
				<Animated.View style={{ transform: [{ translateY: cardTranslateY }] }}>
					<WCard
						style={{
							flex: 0,
							gap: 32,
							borderColor: Colors.greys.grey9,
							borderWidth: 1,
							borderBottomWidth: 0,
							backdropFilter: "blur(6px)",
							paddingBottom: 48,
						}}
					>
						<WText mode="primary" size="2xl">
							{t("cards_right_answer")}
						</WText>
						<View
							style={{
								flexDirection: "row",
								justifyContent: "center",
								alignItems: "stretch",
								gap: 32,
								borderRadius: 16,
								padding: 16,
								backgroundColor: Colors.dark.dark1,
							}}
						>
							<View
								style={{
									flexDirection: "column",
									alignItems: "center",
									justifyContent: "center",
									gap: 8,
								}}
							>
								<WText mode="tertiary" size="sm">
									{t("word")}
								</WText>
								<WText mode="primary" size={fontSize} weight="bold">
									{word}
								</WText>
							</View>
							<View
								style={{
									flexDirection: "column",
									alignItems: "center",
									justifyContent: "center",
									gap: 8,
								}}
							>
								<WText mode="tertiary" size="sm">
									{t("translation")}
								</WText>
								<WText mode="primary" size={fontSize} weight="bold">
									{translation}
								</WText>
							</View>
						</View>
						<WButton mode="primary" fullWidth onPress={requestClose}>
							<WText mode="inverted">{t("button_continue")}</WText>
						</WButton>
					</WCard>
				</Animated.View>
			</View>
		</Modal>
	);
};

const styles = StyleSheet.create({
	overlay: {
		...StyleSheet.absoluteFill,
		backgroundColor: Colors.dark.black60,
	},
	layout: {
		flex: 1,
		justifyContent: "flex-end",
	},
});
