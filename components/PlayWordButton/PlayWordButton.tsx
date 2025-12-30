import { Colors } from "@/mob-ui/brand/colors";
import AntDesign from "@expo/vector-icons/AntDesign";
import { useAudioPlayer } from "expo-audio";
import * as FileSystem from "expo-file-system/legacy";
import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Pressable } from "react-native";
import { styles } from "./PlayWordButton.styles";

export type PlayWordButtonProps = {
	autoplay?: boolean;
	audio: string;
};

export const PlayWordButton = ({ autoplay, audio }: PlayWordButtonProps) => {
	console.log("audio", audio);
	const audioPath = `${FileSystem.documentDirectory}assets/audio/${audio}`;
	const player = useAudioPlayer(audioPath);
	const [isPlaying, setIsPlaying] = useState(false);

	const scaleAnim = useRef(new Animated.Value(1)).current;
	const colorAnim = useRef(new Animated.Value(0)).current;

	const backgroundColor = colorAnim.interpolate({
		inputRange: [0, 1],
		outputRange: [Colors.greys.grey10, Colors.backgrounds.green],
	});

	useEffect(() => {
		player.addListener("playbackStatusUpdate", (status) => {
			setIsPlaying(status.playing);
			if (status.currentTime >= status.duration) {
				player.seekTo(0);
			}
		});

		if (autoplay) player.play();
	}, [player, autoplay]);

	const onPlayPressed = useCallback(() => {
		player.play();
	}, [player]);

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

	return (
		<Pressable onPress={onPlayPressed}>
			<Animated.View
				style={[
					styles.button,
					{ transform: [{ scale: scaleAnim }] },
					{ backgroundColor },
				]}
			>
				<AntDesign name="sound" size={24} color={Colors.greys.white} />
			</Animated.View>
		</Pressable>
	);
};
