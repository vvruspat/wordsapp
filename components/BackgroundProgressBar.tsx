import { memo, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Animated, StyleSheet, View } from "react-native";
import { useVocabularyStore } from "@/hooks/useVocabularyStore";
import { Colors } from "@/mob-ui/brand/colors";

type BackgroundProgressBarProps = {
	bottomOffset: number;
};

export const BackgroundProgressBar = memo(
	({ bottomOffset }: BackgroundProgressBarProps) => {
		const { t } = useTranslation();
		const {
			isAudioDownloading,
			audioDownloadProgress,
			audioDownloadTotal,
			isSyncing,
			isBackgroundSync,
			syncProgress,
			syncStatus,
			error,
		} = useVocabularyStore();
		const [shouldRender, setShouldRender] = useState(false);
		const visibility = useRef(new Animated.Value(0)).current;
		const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
		const showSync = isBackgroundSync && (isSyncing || !!error);
		const visible = showSync || (isAudioDownloading && audioDownloadTotal > 0);

		useEffect(() => {
			if (hideTimerRef.current) {
				clearTimeout(hideTimerRef.current);
				hideTimerRef.current = null;
			}

			if (visible) {
				setShouldRender(true);
				Animated.timing(visibility, {
					toValue: 1,
					duration: 220,
					useNativeDriver: true,
				}).start();
				return;
			}

			if (shouldRender) {
				hideTimerRef.current = setTimeout(() => {
					Animated.timing(visibility, {
						toValue: 0,
						duration: 240,
						useNativeDriver: true,
					}).start(({ finished }) => {
						if (finished) {
							setShouldRender(false);
						}
					});
				}, 700);
			}

			return () => {
				if (hideTimerRef.current) {
					clearTimeout(hideTimerRef.current);
					hideTimerRef.current = null;
				}
			};
		}, [shouldRender, visibility, visible]);

		if (!shouldRender) {
			return null;
		}

		const progress = showSync
			? error && !isSyncing
				? 1
				: syncProgress
			: audioDownloadProgress;
		const clamped = Math.min(1, Math.max(0, progress || 0));
		const widthPercent: `${number}%` = `${Math.round(clamped * 100)}%`;
		const accessibilityLabel = showSync
			? error && !isSyncing
				? t("sync_overlay_error")
				: syncStatus
					? t(syncStatus)
					: t("sync_overlay_syncing")
			: t("sync_status_audio");

		return (
			<Animated.View
				pointerEvents="none"
				accessible
				accessibilityLabel={accessibilityLabel}
				accessibilityValue={{
					min: 0,
					max: 100,
					now: Math.round(clamped * 100),
				}}
				style={[
					styles.container,
					{
						bottom: bottomOffset,
						opacity: visibility,
						transform: [
							{
								translateY: visibility.interpolate({
									inputRange: [0, 1],
									outputRange: [8, 0],
								}),
							},
						],
					},
				]}
			>
				<View style={styles.track}>
					<View
						style={[
							styles.bar,
							{ width: widthPercent },
							error && !isSyncing && showSync && styles.errorBar,
						]}
					/>
				</View>
			</Animated.View>
		);
	},
);

const styles = StyleSheet.create({
	container: {
		position: "absolute",
		right: 0,
		left: 0,
		height: 6,
		zIndex: 50,
		elevation: 50,
		backgroundColor: Colors.dark.black60,
		justifyContent: "center",
	},
	track: {
		width: "100%",
		height: 6,
		backgroundColor: Colors.greys.grey4,
		overflow: "hidden",
	},
	bar: {
		height: "100%",
		backgroundColor: Colors.primary.base,
	},
	errorBar: {
		backgroundColor: Colors.accents.red,
	},
});
