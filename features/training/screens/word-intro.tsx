import { router } from "expo-router";
import { useWordIntro } from "../hooks/useWordIntro";
import {
	KeyboardAvoidingView,
	Platform,
	StyleSheet,
	TextInput,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PlayWordButton } from "@/components/PlayWordButton";
import { WButton, WCard, WText } from "@/mob-ui";
import { Colors } from "@/mob-ui/brand/colors";

export default function WordIntro() {
	const {
		error,
		retry,
		t,
		pairs,
		currentIndex,
		typed,
		setTyped,
		loading,
		handleNext,
	} = useWordIntro();

	if (loading) {
		return (
			<SafeAreaView style={styles.page}>
				<WText mode="secondary">{t("button_continue")}…</WText>
			</SafeAreaView>
		);
	}

	const pair = pairs[currentIndex];
	if (error || !pair)
		return (
			<SafeAreaView style={styles.page}>
				<WText>
					{t(error ? "mix_training_error" : "mix_training_no_words")}
				</WText>
				{error ? (
					<WButton mode="primary" onPress={retry}>
						<WText>{t("button_retry")}</WText>
					</WButton>
				) : null}
				<WButton mode="dark" onPress={() => router.back()}>
					<WText>{t("button_close")}</WText>
				</WButton>
			</SafeAreaView>
		);

	const isLast = currentIndex === pairs.length - 1;

	return (
		<SafeAreaView mode="padding" edges={["top", "bottom"]} style={styles.page}>
			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : "height"}
				style={styles.keyboardView}
			>
				<View style={styles.header}>
					<WText mode="secondary" size="md">
						{currentIndex + 1} / {pairs.length}
					</WText>
				</View>

				<WCard style={styles.card}>
					<View style={styles.cardContent}>
						<WText
							mode="primary"
							weight="bold"
							size="2xl"
							wrap
							style={styles.word}
						>
							{pair.word.word}
						</WText>

						{pair.word.transcription ? (
							<WText mode="secondary" size="xl" style={styles.transcription}>
								{pair.word.transcription}
							</WText>
						) : null}

						<View style={styles.divider} />

						<WText mode="primary" size="xl" wrap style={styles.translation}>
							{pair.translation.translation}
						</WText>

						<PlayWordButton audio={pair.word.audio} autoplay />
					</View>
				</WCard>

				<View style={styles.practiceSection}>
					<WText mode="secondary" size="sm" style={styles.practiceHint}>
						{t("word_intro_type_hint")}
					</WText>
					<TextInput
						style={[
							styles.input,
							typed.toLowerCase().trim() ===
								pair.word.word.toLowerCase().trim() && styles.inputCorrect,
						]}
						value={typed}
						onChangeText={setTyped}
						placeholder={pair.word.word}
						placeholderTextColor={Colors.greys.grey5}
						autoCapitalize="none"
						autoCorrect={false}
						returnKeyType="done"
					/>
				</View>

				<WButton mode="primary" fullWidth onPress={handleNext}>
					<WText mode="inverted">
						{isLast ? t("word_intro_done") : t("word_intro_next")}
					</WText>
				</WButton>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	page: {
		flex: 1,
		backgroundColor: Colors.backgrounds.primaryBackground,
		paddingHorizontal: 16,
	},
	keyboardView: {
		flex: 1,
		gap: 16,
	},
	header: {
		alignItems: "center",
		paddingTop: 8,
	},
	card: {
		flex: 1,
		padding: 0,
		backgroundColor: Colors.backgrounds.primaryBackground,
		borderWidth: 1,
		borderColor: Colors.greys.grey3,
	},
	cardContent: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		gap: 16,
		padding: 24,
	},
	word: {
		textAlign: "center",
	},
	transcription: {
		textAlign: "center",
	},
	divider: {
		width: 48,
		height: 2,
		borderRadius: 1,
		backgroundColor: Colors.greys.grey4,
	},
	translation: {
		textAlign: "center",
	},
	practiceSection: {
		gap: 8,
	},
	practiceHint: {
		textAlign: "center",
	},
	input: {
		borderWidth: 1,
		borderColor: Colors.greys.grey4,
		borderRadius: 12,
		padding: 14,
		fontSize: 16,
		color: Colors.greys.white,
		backgroundColor: Colors.greys.grey10,
		textAlign: "center",
	},
	inputCorrect: {
		borderColor: Colors.accents.green,
	},
});
