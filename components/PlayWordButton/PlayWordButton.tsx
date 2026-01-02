import { Colors } from "@/mob-ui/brand/colors";
import AntDesign from "@expo/vector-icons/AntDesign";
import { AudioStatus, useAudioPlayer } from "expo-audio";
import * as FileSystem from "expo-file-system/legacy";
import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Pressable } from "react-native";
import { styles } from "./PlayWordButton.styles";

export type PlayWordButtonProps = {
	autoplay?: boolean;
	audio: string | null | undefined;
};

export const PlayWordButton = ({ autoplay, audio }: PlayWordButtonProps) => {
	const [isPlaying, setIsPlaying] = useState(false);
	const [hasError, setHasError] = useState(false);

	const scaleAnim = useRef(new Animated.Value(1)).current;
	const colorAnim = useRef(new Animated.Value(0)).current;

	const backgroundColor = colorAnim.interpolate({
		inputRange: [0, 1],
		outputRange: [Colors.greys.grey10, Colors.backgrounds.green],
	});

	// Safely get audio path
	const audioPath = (() => {
		if (!audio || !FileSystem.documentDirectory) {
			return null;
		}
		const filename = audio.split("/").pop();
		if (!filename) {
			return null;
		}
		return `${FileSystem.documentDirectory}assets/audio/${filename}`;
	})();

	const player = useAudioPlayer(audioPath ?? "");

	useEffect(() => {
		if (!audioPath) {
			setHasError(true);
			return;
		}

		const listener = (status: AudioStatus) => {
			setIsPlaying(status.playing);
			if (
				status.duration &&
				status.duration > 0 &&
				status.currentTime >= status.duration
			) {
				try {
					player.seekTo(0);
				} catch (error) {
					console.error("Error seeking audio:", error);
				}
			}
		};

		player.addListener("playbackStatusUpdate", listener);

		if (autoplay) {
			try {
				player.play();
			} catch (error) {
				console.error("Error playing audio:", error);
				setHasError(true);
			}
		}

		return () => {
			player.removeListener("playbackStatusUpdate", listener);
		};
	}, [player, autoplay, audioPath]);

	const onPlayPressed = useCallback(() => {
		if (!audioPath || hasError) {
			return;
		}
		try {
			player.play();
		} catch (error) {
			console.error("Error playing audio:", error);
			setHasError(true);
		}
	}, [player, audioPath, hasError]);

	useEffect(() => {
		if (isPlaying) {
			Animated.loop(
				Animated.sequence([
					Animated.timing(colorAnim, {
						toValue: 1,
						duration: 600,
						useNativeDriver: false,
					}),
					Animated.timing(scaleAnim, {
						toValue: 1.2,
						duration: 400,
						useNativeDriver: false,
					}),
					Animated.timing(scaleAnim, {
						toValue: 1,
						duration: 400,
						useNativeDriver: false,
					}),
					Animated.timing(colorAnim, {
						toValue: 0,
						duration: 600,
						useNativeDriver: false,
					}),
				]),
			).start();
		} else {
			colorAnim.stopAnimation();
			colorAnim.setValue(0);

			scaleAnim.stopAnimation();
			scaleAnim.setValue(1);
		}
	}, [isPlaying, scaleAnim, colorAnim]);

	if (!audio || !audioPath || hasError) {
		return null;
	}

	return (
		<Pressable onPress={onPlayPressed} disabled={hasError}>
			<Animated.View
				style={[
					styles.button,
					{ transform: [{ scale: scaleAnim }] },
					{ backgroundColor },
					hasError && { opacity: 0.5 },
				]}
			>
				<AntDesign name="sound" size={24} color={Colors.greys.white} />
			</Animated.View>
		</Pressable>
	);
};
