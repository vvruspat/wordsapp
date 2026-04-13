import AntDesign from "@expo/vector-icons/AntDesign";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import * as FileSystem from "expo-file-system/legacy";
import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Pressable } from "react-native";
import { Colors } from "@/mob-ui/brand/colors";
import { logger } from "@/utils/logger";
import { styles } from "./PlayWordButton.styles";

export type PlayWordButtonProps = {
	autoplay?: boolean;
	audio: string | null | undefined;
};

function resolveAudioSource(audio: string | null | undefined): string | null {
	if (!audio) {
		return null;
	}

	if (
		audio.startsWith("file://") ||
		audio.startsWith("http://") ||
		audio.startsWith("https://")
	) {
		return audio;
	}

	if (!FileSystem.documentDirectory) {
		return null;
	}

	const normalizedAudio = audio.split("?")[0];

	if (normalizedAudio.startsWith(FileSystem.documentDirectory)) {
		return normalizedAudio;
	}

	const filename = normalizedAudio.split("/").pop();

	if (!filename) {
		return null;
	}

	return `${FileSystem.documentDirectory}assets/audio/${filename}`;
}

export const PlayWordButton = ({ autoplay, audio }: PlayWordButtonProps) => {
	const [isPlaying, setIsPlaying] = useState(false);
	const [hasError, setHasError] = useState(false);
	const pendingAutoplay = useRef(false);

	const scaleAnim = useRef(new Animated.Value(1)).current;
	const colorAnim = useRef(new Animated.Value(0)).current;

	const backgroundColor = colorAnim.interpolate({
		inputRange: [0, 1],
		outputRange: [Colors.greys.grey10, Colors.backgrounds.green],
	});

	const audioSource = resolveAudioSource(audio);
	const player = useAudioPlayer(audioSource ?? undefined);
	const status = useAudioPlayerStatus(player);

	useEffect(() => {
		if (!audioSource) {
			setHasError(true);
			pendingAutoplay.current = false;
			return;
		}

		setHasError(false);
		player.loop = false;
		pendingAutoplay.current = !!autoplay;

		return () => {
			pendingAutoplay.current = false;
			try {
				player.pause();
				void player.seekTo(0);
			} catch {
				// ignore cleanup errors
			}
		};
	}, [audioSource, autoplay, player]);

	useEffect(() => {
		setIsPlaying(status.playing);

		if (
			pendingAutoplay.current &&
			status.isLoaded &&
			!status.isBuffering &&
			!status.playing
		) {
			pendingAutoplay.current = false;

			try {
				void player.seekTo(0);
				player.play();
			} catch (error) {
				logger.error("Error playing audio:", error, "audio");
				setHasError(true);
			}
		}

		if (status.didJustFinish) {
			try {
				player.pause();
				void player.seekTo(0);
			} catch (error) {
				logger.error("Error stopping audio:", error, "audio");
			}
		}
	}, [player, status]);

	const onPlayPressed = useCallback(() => {
		if (!audioSource || hasError) {
			return;
		}

		if (!status.isLoaded || status.isBuffering) {
			pendingAutoplay.current = true;
			return;
		}

		try {
			void player.seekTo(0);
			player.play();
		} catch (error) {
			logger.error("Error playing audio:", error, "audio");
			setHasError(true);
		}
	}, [player, audioSource, hasError, status.isBuffering, status.isLoaded]);

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

	if (!audio || !audioSource || hasError) {
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
