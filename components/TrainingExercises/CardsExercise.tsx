import AntDesign from "@expo/vector-icons/AntDesign";
import { useCallback, useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";
import Animated, {
	Extrapolation,
	interpolate,
	useAnimatedStyle,
	useSharedValue,
	withDelay,
	withTiming,
} from "react-native-reanimated";
import { runOnJS } from "react-native-worklets";
import { GlowingEllipse } from "@/components/GlowingEllipse";
import { PlayWordButton } from "@/components/PlayWordButton";
import { ExerciseContext } from "@/context/ExerciseContext";
import { useExcerciseStore } from "@/hooks/useExcerciseStore";
import { WButton, WCard, WText, WZStack } from "@/mob-ui";
import { Colors } from "@/mob-ui/brand/colors";
import { TrainingPromptCard } from "./TrainingPromptCard";

const SCORE = 0.2;
const FLIP_DURATION = 400;
const SHOW_ANSWER_MS = 3000;
const SWIPE_DURATION = 300;

export function CardsExercise() {
	const { t } = useTranslation();
	const [answered, setAnswered] = useState(false);
	const [answeredKnow, setAnsweredKnow] = useState(false);

	const {
		addCompleteListener,
		removeCompleteListener,
		loadData,
		onFailure,
		onSuccess,
		complete,
	} = useContext(ExerciseContext);
	const { currentPairs } = useExcerciseStore();

	const { word, translation } = currentPairs[0] ?? {
		word: null,
		translation: null,
	};

	const flipProgress = useSharedValue(0);
	const cardTranslateX = useSharedValue(0);
	const cardOpacity = useSharedValue(1);
	const buttonsOpacity = useSharedValue(1);
	const likeTranslateY = useSharedValue(0);
	const likeOpacity = useSharedValue(0);

	const [loadKey, setLoadKey] = useState(0);

	const load = useCallback(async () => {
		await loadData(1, 0, 0);
	}, [loadData]);

	const onExerciseComplete = useCallback(() => {
		setAnswered(false);
		setAnsweredKnow(false);
		flipProgress.value = 0;
		cardTranslateX.value = 0;
		cardOpacity.value = 0;
		buttonsOpacity.value = 0;
		likeTranslateY.value = 0;
		likeOpacity.value = 0;
		setLoadKey((k) => k + 1);
	}, [flipProgress, cardTranslateX, cardOpacity, buttonsOpacity, likeTranslateY, likeOpacity]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: loadKey is a re-trigger counter, not used inside the effect body
	useEffect(() => {
		load();
	}, [load, loadKey]);

	// Animate card in when a new word arrives after exercise completion
	useEffect(() => {
		if (word?.remoteId == null) return;
		cardOpacity.value = withDelay(16, withTiming(1, { duration: 250 }));
		buttonsOpacity.value = withDelay(16, withTiming(1, { duration: 250 }));
	}, [word?.remoteId, cardOpacity, buttonsOpacity]);

	useEffect(() => {
		addCompleteListener(onExerciseComplete);
		return () => removeCompleteListener(onExerciseComplete);
	}, [addCompleteListener, removeCompleteListener, onExerciseComplete]);

	const handleAnswer = useCallback(
		(knows: boolean) => {
			if (!word || !translation || answered) return;
			setAnswered(true);
			setAnsweredKnow(knows);

			if (knows) {
				onSuccess(word.remoteId, SCORE, false);
				likeOpacity.value = withTiming(1, { duration: 300 }, () => {
					likeOpacity.value = withDelay(500, withTiming(0, { duration: 400 }));
				});
				likeTranslateY.value = withTiming(-160, { duration: 1200 });
			} else {
				onFailure(word.remoteId, SCORE, false);
			}

			buttonsOpacity.value = withTiming(0, { duration: 200 });

			flipProgress.value = withTiming(1, { duration: FLIP_DURATION }, (finished) => {
				if (!finished) return;
				cardTranslateX.value = withDelay(
					SHOW_ANSWER_MS,
					withTiming(-500, { duration: SWIPE_DURATION }),
				);
				cardOpacity.value = withDelay(
					SHOW_ANSWER_MS,
					withTiming(0, { duration: SWIPE_DURATION }, (done) => {
						if (done) runOnJS(complete)();
					}),
				);
			});
		},
		[
			word,
			translation,
			answered,
			onSuccess,
			onFailure,
			complete,
			flipProgress,
			cardTranslateX,
			cardOpacity,
			buttonsOpacity,
			likeTranslateY,
			likeOpacity,
		],
	);

	// Front: rotates 0→90° (becomes edge-on), then hidden
	const frontStyle = useAnimatedStyle(() => ({
		opacity: flipProgress.value < 0.5 ? 1 : 0,
		transform: [
			{ perspective: 1200 },
			{
				rotateY: `${interpolate(flipProgress.value, [0, 0.5], [0, 90], Extrapolation.CLAMP)}deg`,
			},
		],
	}));

	// Back: hidden until edge-on, then rotates -90→0°
	const backStyle = useAnimatedStyle(() => ({
		opacity: flipProgress.value >= 0.5 ? 1 : 0,
		transform: [
			{ perspective: 1200 },
			{
				rotateY: `${interpolate(flipProgress.value, [0.5, 1], [-90, 0], Extrapolation.CLAMP)}deg`,
			},
		],
	}));

	const cardContainerStyle = useAnimatedStyle(() => ({
		transform: [{ translateX: cardTranslateX.value }],
		opacity: cardOpacity.value,
	}));

	const buttonsStyle = useAnimatedStyle(() => ({
		opacity: buttonsOpacity.value,
	}));

	const likeStyle = useAnimatedStyle(() => ({
		transform: [{ translateY: likeTranslateY.value }],
		opacity: likeOpacity.value,
	}));

	if (!word || !translation) return null;

	const accentColor = answeredKnow
		? Colors.backgrounds.green
		: Colors.backgrounds.red;

	return (
		<>
			<Animated.View style={[styles.cardContainer, cardContainerStyle]}>
				{/* Front face */}
				<Animated.View style={[StyleSheet.absoluteFill, frontStyle]}>
					<TrainingPromptCard
						word={word.word}
						transcription={word.transcription}
						meaning={word.meaning}
						wordId={word.remoteId}
					>
						<PlayWordButton audio={word.audio} />
					</TrainingPromptCard>
				</Animated.View>

				{/* Back face */}
				<Animated.View style={[StyleSheet.absoluteFill, backStyle]}>
					<WCard style={[styles.backCard, { borderColor: accentColor }]}>
						<WZStack style={styles.backStack}>
							<GlowingEllipse />
							<View style={styles.backContent}>
								<WText mode="primary" weight="bold" size="2xl">
									{word.word}
								</WText>
								<View
									style={[styles.divider, { backgroundColor: accentColor }]}
								/>
								<WText
									mode="primary"
									size="xl"
									wrap
									style={{ textAlign: "center" }}
								>
									{translation.translation}
								</WText>
							</View>
						</WZStack>
					</WCard>
				</Animated.View>

				{/* Floating like icon on success */}
				<Animated.View
					style={[styles.likeContainer, likeStyle]}
					pointerEvents="none"
				>
					<AntDesign
						name="like"
						size={72}
						color={Colors.accents.green}
						style={styles.likeIcon}
					/>
				</Animated.View>
			</Animated.View>

			<Animated.View
				style={buttonsStyle}
				pointerEvents={answered ? "none" : "auto"}
			>
				<View style={styles.buttons}>
					<WButton mode="dark" stretch onPress={() => handleAnswer(false)}>
						<WText>{t("cards_dont_know")}</WText>
					</WButton>
					<WButton mode="dark" stretch onPress={() => handleAnswer(true)}>
						<WText>{t("cards_know")}</WText>
					</WButton>
				</View>
			</Animated.View>
		</>
	);
}

const styles = StyleSheet.create({
	cardContainer: {
		flex: 1,
		width: "100%",
	},
	backCard: {
		width: "100%",
		padding: 0,
		marginVertical: 32,
		backgroundColor: Colors.backgrounds.primaryBackground,
		flex: 1,
		borderWidth: 1,
	},
	backStack: {
		overflow: "hidden",
	},
	backContent: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		padding: 24,
		justifyContent: "center",
		alignItems: "center",
		gap: 24,
	},
	divider: {
		width: 60,
		height: 2,
		borderRadius: 1,
	},
	likeContainer: {
		position: "absolute",
		right: 24,
		bottom: "35%",
		zIndex: 10,
	},
	likeIcon: {
		shadowColor: Colors.accents.green,
		shadowOpacity: 0.8,
		shadowRadius: 20,
		shadowOffset: { width: 0, height: 0 },
	},
	buttons: {
		width: "100%",
		flexDirection: "row",
		justifyContent: "center",
		alignItems: "center",
		alignContent: "stretch",
		gap: 24,
	},
});
