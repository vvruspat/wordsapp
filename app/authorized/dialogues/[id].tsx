import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import NetInfo from "@react-native-community/netinfo";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from "react-native";
import type { DialogueDetail } from "@/api/dialogues";
import { completeDialogue, getDialogueDetail } from "@/api/dialogues";
import { DialogueChat } from "@/components/Dialogue/DialogueChat";
import { dialogueCacheRepository } from "@/db/repositories/dialogueCache.repository";
import { useSessionUser } from "@/hooks/useSession";
import { WText } from "@/mob-ui";
import { Colors } from "@/mob-ui/brand/colors";

export default function DialogueSessionScreen() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const router = useRouter();
	const { t } = useTranslation();
	const { user } = useSessionUser();
	const [detail, setDetail] = useState<DialogueDetail | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [finishing, setFinishing] = useState(false);

	const load = useCallback(async () => {
		if (!id || !user?.userId) return;
		const cached = await dialogueCacheRepository.get(user.userId, id);
		if (cached) setDetail(cached);
		const network = await NetInfo.fetch();
		if (!network.isConnected) return;
		try {
			const remote = await getDialogueDetail(id);
			setDetail(remote);
			await dialogueCacheRepository.upsert(user.userId, remote);
		} catch (loadError) {
			if (!cached) setError(loadError instanceof Error ? loadError.message : t("dialogue_load_error"));
		}
	}, [id, t, user?.userId]);

	useEffect(() => void load(), [load]);

	const finish = async () => {
		if (!detail || !user?.userId) return;
		setFinishing(true);
		try {
			const session = await completeDialogue(detail.session.id);
			const next = { ...detail, session };
			setDetail(next);
			await dialogueCacheRepository.upsert(user.userId, next);
		} catch (finishError) {
			setError(finishError instanceof Error ? finishError.message : t("dialogue_finish_error"));
		} finally {
			setFinishing(false);
		}
	};

	if (!detail) {
		return (
			<View style={styles.center}>
				{error ? <WText style={{ color: Colors.accents.red }}>{error}</WText> : <ActivityIndicator color={Colors.primary.base} size="large" />}
			</View>
		);
	}

	return (
		<View style={styles.page}>
			<View style={styles.header}>
				<Pressable style={styles.headerButton} onPress={() => router.back()}>
					<FontAwesome5 name="chevron-left" color={Colors.greys.white} size={16} />
				</Pressable>
				<View style={{ flex: 1, alignItems: "center" }}>
					<WText weight="semibold" numberOfLines={1}>{detail.session.scenario_title}</WText>
					<WText size="xs" mode="tertiary">{detail.session.difficulty_level} · {detail.session.turn_count}/{detail.session.max_turns}</WText>
				</View>
				{detail.session.status === "active" ? (
					<Pressable
						style={styles.headerButton}
						disabled={finishing}
						onPress={() => Alert.alert(t("dialogue_finish_title"), t("dialogue_finish_description"), [{ text: t("button_cancel"), style: "cancel" }, { text: t("dialogue_finish"), onPress: () => void finish() }])}
					>
						{finishing ? <ActivityIndicator color={Colors.primary.base} /> : <FontAwesome5 name="flag-checkered" color={Colors.primary.base} size={16} />}
					</Pressable>
				) : <View style={styles.headerButton} />}
			</View>
			{error ? <Pressable style={styles.error} onPress={() => setError(null)}><WText size="sm" style={{ color: Colors.accents.red }} wrap>{error}</WText></Pressable> : null}
			<DialogueChat key={detail.session.id} detail={detail} userId={user?.userId ?? 0} onDetailChange={setDetail} />
		</View>
	);
}

const styles = StyleSheet.create({
	page: { flex: 1, backgroundColor: Colors.backgrounds.primaryBackground, paddingTop: 48 },
	center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: Colors.backgrounds.primaryBackground },
	header: { height: 56, flexDirection: "row", alignItems: "center", paddingHorizontal: 12, borderBottomColor: Colors.dark.dark3, borderBottomWidth: 1 },
	headerButton: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
	error: { padding: 10, backgroundColor: Colors.dark.dark2 },
});
