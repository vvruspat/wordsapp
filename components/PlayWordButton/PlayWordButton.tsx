import AntDesign from "@expo/vector-icons/AntDesign";
import { AudioStatus, useAudioPlayer } from "expo-audio";
import * as FileSystem from "expo-file-system/legacy";
import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Pressable } from "react-native";
import { useVocabularyStore } from "@/hooks/useVocabularyStore";
import { Colors } from "@/mob-ui/brand/colors";
import { resolveLocalAudioPath } from "@/utils/audio";
import { logger } from "@/utils/logger";
import { styles } from "./PlayWordButton.styles";

export type PlayWordButtonProps = {
	autoplay?: boolean;
	audio: string | null | undefined;
};

export const PlayWordButton = ({ autoplay, audio }: PlayWordButtonProps) => {
	const [isPlaying, setIsPlaying] = useState(false);
	const [hasError, setHasError] = useState(false);
	const [isAudioAvailable, setIsAudioAvailable] = useState(false);
	const pendingAutoplay = useRef(false);
	const audioDownloadCompleted = useVocabularyStore(
		(state) => state.audioDownloadCompleted,
	);

	const scaleAnim = useRef(new Animated.Value(1)).current;
	const colorAnim = useRef(new Animated.Value(0)).current;

	const backgroundColor = colorAnim.interpolate({
		inputRange: [0, 1],
		outputRange: [Colors.greys.grey10, Colors.backgrounds.green],
	});

	const audioPath = resolveLocalAudioPath(audio);

	const player = useAudioPlayer(isAudioAvailable ? (audioPath ?? "") : "");

	// biome-ignore lint/correctness/useExhaustiveDependencies: audioDownloadCompleted is a refresh trigger for local file availability.
	useEffect(() => {
		let cancelled = false;

		if (!audioPath) {
			setIsAudioAvailable(false);
			return;
		}

		FileSystem.getInfoAsync(audioPath)
			.then((fileInfo) => {
				if (!cancelled) {
					setIsAudioAvailable(fileInfo.exists);
				}
			})
			.catch(() => {
				if (!cancelled) {
					setIsAudioAvailable(false);
				}
			});

		return () => {
			cancelled = true;
		};
	}, [audioPath, audioDownloadCompleted]);

	useEffect(() => {
		if (!audioPath || !isAudioAvailable) {
			pendingAutoplay.current = false;
			setIsPlaying(false);
			setHasError(false);
			return;
		}

		setHasError(false);
		player.loop = false;
		pendingAutoplay.current = !!autoplay;

		const listener = (status: AudioStatus) => {
			setIsPlaying(status.playing);

			// Autoplay only after the audio is fully loaded into the player
			if (pendingAutoplay.current && status.isLoaded && !status.playing) {
				pendingAutoplay.current = false;
				try {
					player.play();
				} catch (error) {
					logger.error("Error playing audio:", error, "audio");
					setHasError(true);
				}
			}

			if (status.didJustFinish) {
				try {
					player.pause();
					player.seekTo(0);
				} catch (error) {
					logger.error("Error stopping audio:", error, "audio");
				}
			}
		};

		player.addListener("playbackStatusUpdate", listener);

		return () => {
			player.removeListener("playbackStatusUpdate", listener);
			// Stop previous word's audio immediately when audio source changes
			pendingAutoplay.current = false;
			try {
				player.pause();
				player.seekTo(0);
			} catch {
				// ignore cleanup errors
			}
		};
	}, [player, autoplay, audioPath, isAudioAvailable]);

	const onPlayPressed = useCallback(() => {
		if (!audioPath || !isAudioAvailable || hasError) {
			return;
		}
		try {
			player.play();
		} catch (error) {
			logger.error("Error playing audio:", error, "audio");
			setHasError(true);
		}
	}, [player, audioPath, isAudioAvailable, hasError]);

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

	if (!audio || !audioPath) {
		return null;
	}

	const disabled = !isAudioAvailable || hasError;

	return (
		<Pressable
			onPress={onPlayPressed}
			disabled={disabled}
			accessibilityState={{ disabled }}
		>
			<Animated.View
				style={[
					styles.button,
					{ transform: [{ scale: scaleAnim }] },
					{ backgroundColor },
					disabled && styles.buttonDisabled,
				]}
			>
				<AntDesign
					name="sound"
					size={24}
					color={disabled ? Colors.greys.grey5 : Colors.greys.white}
				/>
			</Animated.View>
		</Pressable>
	);
};
