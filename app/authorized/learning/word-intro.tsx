import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
	KeyboardAvoidingView,
	Platform,
	StyleSheet,
	TextInput,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PlayWordButton } from "@/components/PlayWordButton";
import { learningRepository } from "@/db/repositories/learning.repository";
import { translationsRepository } from "@/db/repositories/translations.repository";
import { wordsRepository } from "@/db/repositories/words.repository";
import WatermelonWord from "@/db/models/Word";
import WatermelonWordTranslation from "@/db/models/WordTranslation";
import { useExcerciseStore } from "@/hooks/useExcerciseStore";
import { useSessionUser } from "@/hooks/useSession";
import { WButton, WCard, WText } from "@/mob-ui";
import { Colors } from "@/mob-ui/brand/colors";

type WordPair = {
	word: WatermelonWord;
	translation: WatermelonWordTranslation;
};

function parseWordIds(raw: string | undefined): number[] {
	if (!raw) return [];
	return raw
		.split(",")
		.map(Number)
		.filter((n) => !Number.isNaN(n));
}

export default function WordIntro() {
	const { t } = useTranslation();
	const { wordIds } = useLocalSearchParams<{ wordIds: string }>();
	const { user } = useSessionUser();
	const { setChunkWordIds } = useExcerciseStore();

	const [pairs, setPairs] = useState<WordPair[]>([]);
	const [currentIndex, setCurrentIndex] = useState(0);
	const [typed, setTyped] = useState("");
	const [loading, setLoading] = useState(true);

	// Parse IDs inside the effect so wordIds (stable string) is the only dep
	useEffect(() => {
		const ids = parseWordIds(wordIds);
		if (!ids.length || !user?.language_speak) return;
		setLoading(true);
		wordsRepository
			.getByRemoteIds(ids, user.language_learn ?? "en")
			.then(async (fetchedWords) => {
				const ordered = ids
					.map((id) => fetchedWords.find((w) => w.remoteId === id))
					.filter(Boolean) as WatermelonWord[];
				const translations = await translationsRepository.getByWordIds(
					user.language_speak ?? "en",
					ordered.map((w) => w.remoteId),
				);
				const loadedPairs = ordered
					.map((word) => ({
						word,
						translation: translations.find((tr) => tr.word === word.remoteId),
					}))
					.filter((p): p is WordPair => p.translation !== undefined);
				setPairs(loadedPairs);
			})
			.finally(() => setLoading(false));
	}, [wordIds, user?.language_speak, user?.language_learn]);

	const handleNext = useCallback(async () => {
		const pair = pairs[currentIndex];
		if (!pair || !user?.userId) return;

		await learningRepository.recordIntro({
			userId: user.userId,
			wordId: pair.word.remoteId,
			translationId: pair.translation.remoteId,
		});

		const isLast = currentIndex === pairs.length - 1;

		if (!isLast) {
			setCurrentIndex((i) => i + 1);
			setTyped("");
			return;
		}

		// All words introduced — collect ALL introduced word IDs for this user.
		// ExerciseContext will intersect these with the current topic/catalog scope.
		const allRecords = await learningRepository.getByUser(user.userId);
		const allIntroducedIds = allRecords
			.filter((r) => r.training === "intro")
			.map((r) => r.wordId);

		const fallbackIds = parseWordIds(wordIds);
		setChunkWordIds(allIntroducedIds.length > 0 ? allIntroducedIds : fallbackIds);
		router.replace("/authorized/learning/mix-training");
	}, [pairs, currentIndex, user, wordIds, setChunkWordIds]);

	if (loading) {
		return (
			<SafeAreaView style={styles.page}>
				<WText mode="secondary">{t("button_continue")}…</WText>
			</SafeAreaView>
		);
	}

	const pair = pairs[currentIndex];
	if (!pair) return null;

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
						<WText mode="primary" weight="bold" size="2xl" wrap style={styles.word}>
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
