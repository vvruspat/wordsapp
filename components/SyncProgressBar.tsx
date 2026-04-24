import { memo, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Animated, Modal, StyleSheet, Text, View } from "react-native";
import { useVocabularyStore } from "@/hooks/useVocabularyStore";
import { Colors } from "@/mob-ui/brand/colors";

export const SyncProgressBar = memo(() => {
	const { t } = useTranslation();
	const { isSyncing, syncProgress, syncStatus, error, clearError } =
		useVocabularyStore();
	const visible = isSyncing || !!error;
	const [shouldRender, setShouldRender] = useState(visible);
	const visibility = useRef(new Animated.Value(visible ? 1 : 0)).current;

	useEffect(() => {
		if (error && !isSyncing) {
			const timer = setTimeout(() => {
				clearError();
			}, 3000);
			return () => clearTimeout(timer);
		}
	}, [error, isSyncing, clearError]);

	useEffect(() => {
		if (visible) {
			setShouldRender(true);
			Animated.spring(visibility, {
				toValue: 1,
				useNativeDriver: true,
				damping: 18,
				stiffness: 180,
			}).start();
			return;
		}

		Animated.timing(visibility, {
			toValue: 0,
			duration: 240,
			useNativeDriver: true,
		}).start(({ finished }) => {
			if (finished) {
				setShouldRender(false);
			}
		});
	}, [visibility, visible]);

	if (!shouldRender) {
		return null;
	}

	const clamped = Math.min(1, Math.max(0, syncProgress || 0));
	const widthPercent: `${number}%` = `${Math.round(clamped * 100)}%`;

	return (
		<Modal
			visible={shouldRender}
			transparent
			animationType="none"
			statusBarTranslucent
		>
			<Animated.View
				style={[
					styles.overlay,
					{
						opacity: visibility.interpolate({
							inputRange: [0, 1],
							outputRange: [0, 1],
						}),
					},
				]}
			>
				<Animated.View
					style={[
						styles.container,
						{
							opacity: visibility,
							transform: [
								{
									scale: visibility.interpolate({
										inputRange: [0, 1],
										outputRange: [0.96, 1],
									}),
								},
								{
									translateY: visibility.interpolate({
										inputRange: [0, 1],
										outputRange: [12, 0],
									}),
								},
							],
						},
					]}
				>
					{error ? (
						<Text style={styles.errorLabel}>{t("sync_overlay_error")}</Text>
					) : (
						<>
							<Text style={styles.label}>
								{syncStatus ? t(syncStatus) : t("sync_overlay_syncing")}
							</Text>
							<View style={styles.track}>
								<View style={[styles.bar, { width: widthPercent }]} />
							</View>
							<Text style={styles.percent}>{Math.round(clamped * 100)}%</Text>
						</>
					)}
				</Animated.View>
			</Animated.View>
		</Modal>
	);
});

const styles = StyleSheet.create({
	overlay: {
		flex: 1,
		backgroundColor: "rgba(0, 0, 0, 0.5)",
		justifyContent: "center",
		alignItems: "center",
	},
	container: {
		width: "75%",
		backgroundColor: Colors.greys.grey10,
		borderRadius: 16,
		paddingVertical: 32,
		paddingHorizontal: 24,
		alignItems: "center",
		gap: 16,
	},
	label: {
		color: Colors.greys.white,
		fontSize: 16,
		fontWeight: "600",
	},
	errorLabel: {
		color: Colors.accents.red,
		fontSize: 16,
		fontWeight: "600",
		textAlign: "center",
	},
	track: {
		width: "100%",
		height: 8,
		borderRadius: 4,
		backgroundColor: Colors.greys.grey4,
		overflow: "hidden",
	},
	bar: {
		height: "100%",
		borderRadius: 4,
		backgroundColor: Colors.primary.base,
	},
	percent: {
		color: Colors.greys.grey5,
		fontSize: 13,
	},
});
