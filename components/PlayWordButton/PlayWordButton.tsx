import AntDesign from "@expo/vector-icons/AntDesign";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import * as FileSystem from "expo-file-system/legacy";
import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Pressable } from "react-native";
import { useVocabularyStore } from "@/hooks/useVocabularyStore";
import { Colors } from "@/mob-ui/brand/colors";
import { isRemoteAudioPath, resolveLocalAudioPath } from "@/utils/audio";
import { logger } from "@/utils/logger";
import { styles } from "./PlayWordButton.styles";

export type PlayWordButtonProps = {
	autoplay?: boolean;
	audio: string | null | undefined;
};

export const PlayWordButton = ({ autoplay, audio }: PlayWordButtonProps) => {
	const [isPlaying, setIsPlaying] = useState(false);
	const [hasError, setHasError] = useState(false);
	const [audioSource, setAudioSource] = useState<string | null>(null);
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

	const localAudioPath = resolveLocalAudioPath(audio);
	const remoteAudioSource = isRemoteAudioPath(audio) ? (audio ?? null) : null;

	const player = useAudioPlayer(audioSource, {
		downloadFirst: true,
		keepAudioSessionActive: true,
	});
	const status = useAudioPlayerStatus(player);

	const playFromStart = useCallback(async () => {
		try {
			if (player.currentTime > 0.05) {
				await player.seekTo(0);
			}
			player.play();
		} catch (error) {
			logger.error("Error playing audio:", error, "audio");
			setHasError(true);
		}
	}, [player]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: audioDownloadCompleted is a refresh trigger for local file availability.
	useEffect(() => {
		let cancelled = false;

		if (!localAudioPath) {
			setAudioSource(remoteAudioSource);
			return;
		}

		FileSystem.getInfoAsync(localAudioPath)
			.then((fileInfo) => {
				if (!cancelled) {
					setAudioSource(fileInfo.exists ? localAudioPath : remoteAudioSource);
				}
			})
			.catch(() => {
				if (!cancelled) {
					setAudioSource(remoteAudioSource);
				}
			});

		return () => {
			cancelled = true;
		};
	}, [localAudioPath, remoteAudioSource, audioDownloadCompleted]);

	useEffect(() => {
		if (!audioSource) {
			pendingAutoplay.current = false;
			setIsPlaying(false);
			setHasError(false);
			return;
		}

		setHasError(false);
		player.loop = false;
		pendingAutoplay.current = !!autoplay;

		return () => {
			// Stop previous word's audio immediately when audio source changes
			pendingAutoplay.current = false;
			try {
				player.pause();
				void player.seekTo(0).catch(() => {});
			} catch {
				// ignore cleanup errors
			}
		};
	}, [player, autoplay, audioSource]);

	useEffect(() => {
		setIsPlaying(status.playing);

		if (
			pendingAutoplay.current &&
			status.isLoaded &&
			!status.isBuffering &&
			!status.playing
		) {
			pendingAutoplay.current = false;
			void playFromStart();
		}

		if (status.didJustFinish) {
			try {
				player.pause();
				void player.seekTo(0).catch((error) => {
					logger.error("Error rewinding audio:", error, "audio");
				});
			} catch (error) {
				logger.error("Error stopping audio:", error, "audio");
			}
		}
	}, [player, playFromStart, status]);

	const onPlayPressed = useCallback(() => {
		if (!audioSource || hasError) {
			return;
		}

		if (!status.isLoaded || status.isBuffering) {
			pendingAutoplay.current = true;
			return;
		}

		void playFromStart();
	}, [
		audioSource,
		hasError,
		playFromStart,
		status.isBuffering,
		status.isLoaded,
	]);

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

	if (!audio || (!localAudioPath && !remoteAudioSource)) {
		return null;
	}

	const disabled = !audioSource || hasError;

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
