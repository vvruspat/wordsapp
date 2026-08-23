import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import { Pressable, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { VocabularyResult } from "@/api/dialogues";
import { WText } from "@/mob-ui";
import { Colors } from "@/mob-ui/brand/colors";

export const VocabularyResultCard = ({
	result,
	message,
	onClose,
}: {
	result?: VocabularyResult | null;
	message?: string | null;
	onClose: () => void;
}) => {
	const { t } = useTranslation();
	return (
		<Pressable style={styles.card} onPress={onClose}>
			<View style={styles.header}>
				<FontAwesome5
					name={result?.isNew ? "plus-circle" : "check-circle"}
					color={Colors.primary.base}
					size={16}
				/>
				<WText size="sm" weight="semibold" wrap style={{ flex: 1 }}>
					{result
						? result.isNew
							? t("dialogue_word_added", { word: result.word.word })
							: t("dialogue_word_known", { word: result.word.word })
						: message}
				</WText>
				<FontAwesome5 name="times" color={Colors.greys.grey6} size={13} />
			</View>
			{result ? (
				<View style={styles.details}>
					<View style={{ flex: 1, gap: 3 }}>
						<WText size="lg" weight="bold">{result.word.word}</WText>
						<WText size="sm" mode="secondary" wrap>{result.translation.translation}</WText>
						{result.word.meaning ? <WText size="xs" mode="tertiary" wrap>{result.word.meaning}</WText> : null}
					</View>
					<View style={styles.score}>
						<WText size="xs" mode="tertiary">{t("dialogue_writing")}</WText>
						<WText weight="bold" style={{ color: Colors.primary.base }}>
							{result.progress.writing?.score ?? "—"}
						</WText>
					</View>
				</View>
			) : null}
		</Pressable>
	);
};

const styles = StyleSheet.create({
	card: {
		marginHorizontal: 16,
		marginBottom: 8,
		padding: 13,
		borderRadius: 15,
		backgroundColor: Colors.dark.dark3,
		borderColor: Colors.primary.disabled,
		borderWidth: 1,
		gap: 10,
	},
	header: { flexDirection: "row", gap: 9, alignItems: "center" },
	details: { flexDirection: "row", gap: 12, alignItems: "center" },
	score: { minWidth: 64, alignItems: "center", backgroundColor: Colors.dark.dark2, borderRadius: 10, padding: 8 },
});
