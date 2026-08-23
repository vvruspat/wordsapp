import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import NetInfo from "@react-native-community/netinfo";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
	ActivityIndicator,
	Pressable,
	RefreshControl,
	ScrollView,
	StyleSheet,
	TextInput,
	View,
} from "react-native";
import type { DialogueScenario, DialogueSession } from "@/api/dialogues";
import {
	getActiveDialogue,
	getDialogueHistory,
	getDialogueRecommendations,
	startDialogue,
} from "@/api/dialogues";
import { dialogueCacheRepository } from "@/db/repositories/dialogueCache.repository";
import { useSessionUser } from "@/hooks/useSession";
import { WText } from "@/mob-ui";
import { Colors } from "@/mob-ui/brand/colors";

export default function DialoguesScreen() {
	const router = useRouter();
	const { t } = useTranslation();
	const { user } = useSessionUser();
	const [online, setOnline] = useState(true);
	const [active, setActive] = useState<DialogueSession | null>(null);
	const [history, setHistory] = useState<DialogueSession[]>([]);
	const [scenarios, setScenarios] = useState<DialogueScenario[]>([]);
	const [customTopic, setCustomTopic] = useState("");
	const [loading, setLoading] = useState(true);
	const [starting, setStarting] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => NetInfo.addEventListener((state) => setOnline(Boolean(state.isConnected))), []);

	const load = useCallback(async () => {
		if (!user?.userId) return;
		setLoading(true);
		setError(null);
		const cached = await dialogueCacheRepository.list(user.userId);
		setHistory(cached.map((item) => item.session));
		setActive(cached.find((item) => item.session.status === "active")?.session ?? null);
		if (!online) {
			setLoading(false);
			return;
		}
		try {
			const [remoteActive, remoteHistory] = await Promise.all([
				getActiveDialogue(),
				getDialogueHistory(),
			]);
			setActive(remoteActive);
			setHistory(remoteHistory);
			await dialogueCacheRepository.mergeSessions(user.userId, remoteHistory);
			if (!remoteActive) {
				const recommendations = await getDialogueRecommendations();
				setScenarios(recommendations.scenarios);
			}
		} catch (loadError) {
			setError(loadError instanceof Error ? loadError.message : t("dialogue_load_error"));
		} finally {
			setLoading(false);
		}
	}, [online, t, user?.userId]);

	useFocusEffect(useCallback(() => void load(), [load]));

	const start = async (scenario?: DialogueScenario) => {
		if (!user?.userId || !online || active) return;
		const topic = customTopic.trim();
		if (!scenario && !topic) return;
		setStarting(scenario?.title ?? topic);
		setError(null);
		try {
			const detail = await startDialogue(
				scenario
					? { title: scenario.title, description: scenario.description }
					: { customTopic: topic },
			);
			await dialogueCacheRepository.upsert(user.userId, detail);
			router.push({ pathname: "/authorized/dialogues/[id]", params: { id: detail.session.id } });
		} catch (startError) {
			setError(startError instanceof Error ? startError.message : t("dialogue_start_error"));
		} finally {
			setStarting(null);
		}
	};

	return (
		<View style={styles.page}>
			<ScrollView
				contentContainerStyle={styles.content}
				refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={Colors.primary.base} />}
				keyboardShouldPersistTaps="handled"
			>
				<View style={styles.heading}>
					<View>
						<WText size="2xl" weight="bold">{t("dialogue_title")}</WText>
						<WText mode="secondary">{t("dialogue_subtitle")}</WText>
					</View>
					<View style={styles.levelPill}>
						<WText size="sm" weight="semibold" style={{ color: Colors.primary.base }}>
							{active?.difficulty_level ?? "A1"}
						</WText>
					</View>
				</View>

				{!online ? (
					<View style={styles.infoCard}>
						<FontAwesome5 name="wifi" color={Colors.accents.orange} />
						<WText size="sm" wrap>{t("dialogue_offline_info")}</WText>
					</View>
				) : null}

				{error ? <WText size="sm" style={{ color: Colors.accents.red }} wrap>{error}</WText> : null}

				{active ? (
					<Pressable
						style={styles.activeCard}
						onPress={() => router.push({ pathname: "/authorized/dialogues/[id]", params: { id: active.id } })}
					>
						<View style={{ flex: 1, gap: 5 }}>
							<WText size="xs" weight="semibold" style={{ color: Colors.primary.base }}>{t("dialogue_active").toUpperCase()}</WText>
							<WText size="lg" weight="semibold" wrap>{active.scenario_title}</WText>
							<WText size="sm" mode="secondary">{t("dialogue_turns", { count: active.turn_count, target: active.target_turns })}</WText>
						</View>
						<FontAwesome5 name="arrow-right" color={Colors.primary.base} size={18} />
					</Pressable>
				) : null}

				<View style={styles.sectionTitle}>
					<WText size="lg" weight="semibold">{t("dialogue_choose_scenario")}</WText>
					{loading && scenarios.length === 0 ? <ActivityIndicator color={Colors.primary.base} /> : null}
				</View>

				{scenarios.map((scenario, index) => (
					<Pressable
						key={scenario.title}
						style={({ pressed }) => [styles.scenarioCard, pressed && { opacity: 0.75 }, active && { opacity: 0.45 }]}
						disabled={Boolean(active) || Boolean(starting)}
						onPress={() => void start(scenario)}
					>
						<View style={[styles.icon, { backgroundColor: [Colors.backgrounds.cyan, Colors.backgrounds.purple, Colors.backgrounds.orange, Colors.backgrounds.blue][index % 4] }]}>
							<FontAwesome5 name={["coffee", "shopping-basket", "map-marked-alt", "users"][index % 4]} color={Colors.greys.white} size={17} />
						</View>
						<View style={{ flex: 1, gap: 4 }}>
							<WText weight="semibold" wrap>{scenario.title}</WText>
							<WText size="sm" mode="secondary" wrap>{scenario.description}</WText>
							<WText size="xs" mode="tertiary">{t("dialogue_minutes", { count: scenario.estimatedMinutes })}</WText>
						</View>
						{starting === scenario.title ? <ActivityIndicator color={Colors.primary.base} /> : <FontAwesome5 name="chevron-right" color={Colors.greys.grey6} />}
					</Pressable>
				))}

				<View style={styles.customCard}>
					<WText weight="semibold">{t("dialogue_custom_topic")}</WText>
					<TextInput
						value={customTopic}
						onChangeText={setCustomTopic}
						editable={!active && !starting}
						placeholder={t("dialogue_custom_placeholder")}
						placeholderTextColor={Colors.greys.grey6}
						style={styles.input}
						maxLength={500}
					/>
					<Pressable
						style={[styles.startButton, (!customTopic.trim() || active || !online) && styles.disabled]}
						disabled={!customTopic.trim() || Boolean(active) || !online || Boolean(starting)}
						onPress={() => void start()}
					>
						{starting === customTopic.trim() ? <ActivityIndicator color={Colors.greys.grey10} /> : <WText mode="inverted" weight="semibold">{t("dialogue_start")}</WText>}
					</Pressable>
				</View>

				{history.length > 0 ? (
					<View style={{ gap: 10 }}>
						<WText size="lg" weight="semibold">{t("dialogue_history")}</WText>
						{history.filter((item) => item.id !== active?.id).map((item) => (
							<Pressable key={item.id} style={styles.historyRow} onPress={() => router.push({ pathname: "/authorized/dialogues/[id]", params: { id: item.id } })}>
								<View style={{ flex: 1, gap: 3 }}>
									<WText weight="medium" wrap>{item.scenario_title}</WText>
									<WText size="xs" mode="tertiary">{new Date(item.updated_at).toLocaleDateString()} · {t("dialogue_history_turns", { count: item.turn_count })}</WText>
								</View>
								<FontAwesome5 name="chevron-right" color={Colors.greys.grey6} />
							</Pressable>
						))}
					</View>
				) : null}
			</ScrollView>
		</View>
	);
}

const styles = StyleSheet.create({
	page: { flex: 1, backgroundColor: Colors.backgrounds.primaryBackground },
	content: { paddingTop: 60, paddingHorizontal: 18, paddingBottom: 40, gap: 16 },
	heading: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
	levelPill: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 14, backgroundColor: Colors.dark.dark2, borderWidth: 1, borderColor: Colors.primary.disabled },
	infoCard: { flexDirection: "row", gap: 10, padding: 13, borderRadius: 14, backgroundColor: Colors.dark.dark2, alignItems: "center" },
	activeCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: Colors.dark.dark2, padding: 17, borderRadius: 20, borderColor: Colors.primary.disabled, borderWidth: 1 },
	sectionTitle: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
	scenarioCard: { flexDirection: "row", alignItems: "center", gap: 13, padding: 15, borderRadius: 18, backgroundColor: Colors.dark.dark2 },
	icon: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center" },
	customCard: { gap: 12, padding: 16, backgroundColor: Colors.dark.dark2, borderRadius: 18 },
	input: { minHeight: 48, color: Colors.greys.white, backgroundColor: Colors.dark.dark3, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
	startButton: { minHeight: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: Colors.primary.base },
	disabled: { opacity: 0.4 },
	historyRow: { flexDirection: "row", alignItems: "center", gap: 12, borderBottomColor: Colors.dark.dark3, borderBottomWidth: 1, paddingVertical: 12 },
});
