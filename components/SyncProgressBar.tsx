import { memo } from "react";
import { StyleSheet, View } from "react-native";
import { useVocabularyStore } from "@/hooks/useVocabularyStore";
import { Colors } from "@/mob-ui/brand/colors";

export const SyncProgressBar = memo(() => {
	const { isSyncing, syncProgress } = useVocabularyStore();

	if (!isSyncing) {
		return null;
	}

	const clamped = Math.min(1, Math.max(0, syncProgress || 0));
	const widthPercent: `${number}%` = `${Math.round(clamped * 100)}%`;

	return (
		<View pointerEvents="none" style={styles.container}>
			<View style={styles.track}>
				<View style={[styles.bar, { width: widthPercent }]} />
			</View>
		</View>
	);
});

const styles = StyleSheet.create({
	container: {
		paddingHorizontal: 16,
		paddingVertical: 4,
		backgroundColor: Colors.backgrounds.primaryBackground,
		borderTopWidth: 1,
		borderTopColor: Colors.greys.whiteAlpha60,
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
