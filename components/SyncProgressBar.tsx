import { useVocabularyStore } from "@/hooks/useVocabularyStore";
import { Colors } from "@/mob-ui/brand/colors";
import { memo } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export const SyncProgressBar = memo(() => {
	const { isSyncing, syncProgress } = useVocabularyStore();
	const insets = useSafeAreaInsets();

	if (!isSyncing) {
		return null;
	}

	const clamped = Math.min(1, Math.max(0, syncProgress || 0));
	const widthPercent = `${Math.round(clamped * 100)}%`;

	return (
		<View
			pointerEvents="none"
			style={[
				styles.container,
				{ paddingBottom: Math.max(8, insets.bottom + 4) },
			]}
		>
			<View style={styles.track}>
				<View style={[styles.bar, { width: widthPercent }]} />
			</View>
		</View>
	);
});

const styles = StyleSheet.create({
	container: {
		position: "absolute",
		left: 0,
		right: 0,
		bottom: 0,
		paddingHorizontal: 16,
		zIndex: 5,
	},
	track: {
		height: 4,
		borderRadius: 2,
		backgroundColor: Colors.greys.grey2,
		overflow: "hidden",
	},
	bar: {
		height: "100%",
		backgroundColor: Colors.primary.base,
	},
});
