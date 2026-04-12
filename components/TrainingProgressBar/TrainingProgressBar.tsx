import { ExerciseContext } from "@/context/ExerciseContext";
import { Colors } from "@/mob-ui/brand/colors";
import { useContext, useEffect, useRef } from "react";
import { Animated, Easing, View } from "react-native";

type TrainingProgressBarProps = {
	successCount?: number;
	failureCount?: number;
	totalCount?: number;
	backgroundColor?: string;
	flashTrigger?: number;
};

export function TrainingProgressBar({
	successCount: providedSuccessCount,
	failureCount: providedFailureCount,
	totalCount: providedTotalCount,
	backgroundColor = Colors.dark.dark3,
	flashTrigger = 0,
}: TrainingProgressBarProps) {
	const {
		sessionStats: {
			successCount: contextSuccessCount,
			failureCount: contextFailureCount,
			totalCount: contextTotalCount,
		},
	} = useContext(ExerciseContext);

	const successCount = providedSuccessCount ?? contextSuccessCount;
	const failureCount = providedFailureCount ?? contextFailureCount;
	const totalCount = providedTotalCount ?? contextTotalCount;

	const remainder = Math.max(0, totalCount - successCount - failureCount);
	const flashOpacity = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		if (flashTrigger === 0) {
			return;
		}

		flashOpacity.stopAnimation();
		flashOpacity.setValue(0);

		Animated.sequence([
			Animated.timing(flashOpacity, {
				toValue: 0.95,
				duration: 140,
				easing: Easing.out(Easing.quad),
				useNativeDriver: true,
			}),
			Animated.timing(flashOpacity, {
				toValue: 0,
				duration: 220,
				easing: Easing.in(Easing.quad),
				useNativeDriver: true,
			}),
			Animated.timing(flashOpacity, {
				toValue: 0.6,
				duration: 120,
				easing: Easing.out(Easing.quad),
				useNativeDriver: true,
			}),
			Animated.timing(flashOpacity, {
				toValue: 0,
				duration: 260,
				easing: Easing.in(Easing.quad),
				useNativeDriver: true,
			}),
		]).start();
	}, [flashOpacity, flashTrigger]);

	return (
		<View
			style={{
				position: "relative",
				flexDirection: "row",
				height: 6,
				borderRadius: 3,
				borderWidth: 1,
				borderColor: backgroundColor,
				overflow: "hidden",
				width: "100%",
				backgroundColor,
			}}
		>
			{successCount > 0 && (
				<View
					style={{ flex: successCount, backgroundColor: Colors.accents.green }}
				/>
			)}
			{failureCount > 0 && (
				<View
					style={{ flex: failureCount, backgroundColor: Colors.accents.red }}
				/>
			)}
			{remainder > 0 && <View style={{ flex: remainder }} />}
			{totalCount === 0 && <View style={{ flex: 1 }} />}
			<Animated.View
				pointerEvents="none"
				style={{
					position: "absolute",
					top: 0,
					right: 0,
					bottom: 0,
					left: 0,
					backgroundColor: Colors.greys.white,
					opacity: flashOpacity,
				}}
			/>
		</View>
	);
}
