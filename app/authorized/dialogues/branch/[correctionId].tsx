import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import NetInfo from "@react-native-community/netinfo";
import {
	AssistantRuntimeProvider,
	ComposerPrimitive,
	ThreadPrimitive,
	type ChatModelAdapter,
	type ThreadMessageLike,
	useLocalRuntime,
} from "@assistant-ui/react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import type {
	DialogueDetail,
	ExplanationBranch,
	VocabularyResult,
} from "@/api/dialogues";
import {
	addDialogueWord,
	openCorrectionBranch,
	sendBranchMessage,
} from "@/api/dialogues";
import { TappableText } from "@/components/Dialogue/TappableText";
import { VocabularyResultCard } from "@/components/Dialogue/VocabularyResultCard";
import { dialogueCacheRepository } from "@/db/repositories/dialogueCache.repository";
import { dialogueVocabularyRepository } from "@/db/repositories/dialogueVocabulary.repository";
import { useSessionUser } from "@/hooks/useSession";
import { WText } from "@/mob-ui";
import { Colors } from "@/mob-ui/brand/colors";

const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}-branch`;

const toInitialMessages = (branch: ExplanationBranch): ThreadMessageLike[] =>
	branch.messages.map((message) => ({
		id: message.id,
		role: message.role as "user" | "assistant",
		content: message.content,
		createdAt: new Date(message.created_at),
		metadata: { custom: { serverMessageId: message.id } },
	}));

type RenderMessage = {
	role: "user" | "assistant" | "system";
	content: ReadonlyArray<{ type: string; text?: string }>;
	metadata: { custom?: Record<string, unknown> };
};

const getText = (message: RenderMessage) =>
	message.content.map((part) => (part.type === "text" ? (part.text ?? "") : "")).join("");

function BranchThread({
	branch,
	userId,
	onBranchChange,
}: {
	branch: ExplanationBranch;
	userId: number;
	onBranchChange: (branch: ExplanationBranch) => void;
}) {
	const [online, setOnline] = useState(true);
	const { t } = useTranslation();
	const [notice, setNotice] = useState<{
		message?: string;
		result?: VocabularyResult;
	} | null>(null);
	const branchRef = useRef(branch);
	branchRef.current = branch;

	useEffect(() => NetInfo.addEventListener((state) => setOnline(Boolean(state.isConnected))), []);

	const model = useMemo<ChatModelAdapter>(
		() => ({
			async run({ messages }) {
				if (!online) throw new Error("No network connection");
				const last = messages.at(-1);
				if (!last || last.role !== "user") throw new Error("User message is missing");
				const content = last.content.map((part) => (part.type === "text" ? part.text : "")).join("");
				const response = await sendBranchMessage(branch.thread.id, content, makeId());
				const next = {
					...branchRef.current,
					messages: [...branchRef.current.messages, response.userMessage, response.assistantMessage],
				};
				branchRef.current = next;
				onBranchChange(next);
				const cached = await dialogueCacheRepository.get(userId, branch.correction.session_id);
				if (cached) {
					await dialogueCacheRepository.upsert(userId, {
						...cached,
						messages: [...cached.messages.filter((message) => message.thread_id !== branch.thread.id), ...next.messages],
					});
				}
				return {
					content: [{ type: "text" as const, text: response.assistantMessage.content }],
					metadata: { custom: { serverMessageId: response.assistantMessage.id } },
				};
			},
		}),
		[branch.correction.session_id, branch.thread.id, onBranchChange, online, userId],
	);

	const runtime = useLocalRuntime(model, { initialMessages: toInitialMessages(branch) });

	const addWord = useCallback(
		async (word: string, context: string, messageId?: string) => {
			if (!online) {
				setNotice({ message: t("dialogue_word_offline") });
				return;
			}
			setNotice({ message: t("dialogue_word_adding", { word }) });
			try {
				const results = await addDialogueWord(branch.correction.session_id, { word, context, messageId });
				await dialogueVocabularyRepository.integrate(userId, results);
				setNotice(results[0] ? { result: results[0] } : null);
			} catch (error) {
				setNotice({ message: error instanceof Error ? error.message : t("dialogue_word_error") });
			}
		},
		[branch.correction.session_id, online, t, userId],
	);

	return (
		<AssistantRuntimeProvider runtime={runtime}>
			<ThreadPrimitive.Root style={{ flex: 1 }}>
				{!online ? <View style={styles.offline}><WText size="xs" style={{ color: Colors.accents.orange }}>{t("dialogue_offline_send")}</WText></View> : null}
				<ThreadPrimitive.MessagesFlatList style={{ flex: 1 }} contentContainerStyle={styles.messages} keyboardShouldPersistTaps="handled">
					{({ message }) => {
						const content = getText(message);
						const serverMessageId = message.metadata.custom?.serverMessageId as string | undefined;
						return (
							<View style={[styles.message, message.role === "user" ? styles.user : styles.assistant]}>
								<TappableText
									text={content}
									align={message.role === "user" ? "right" : "left"}
									onWordPress={
										message.role === "user"
											? undefined
											: (word) => void addWord(word, content, serverMessageId)
									}
								/>
							</View>
						);
					}}
				</ThreadPrimitive.MessagesFlatList>
				{notice ? <VocabularyResultCard result={notice.result} message={notice.message} onClose={() => setNotice(null)} /> : null}
				<ComposerPrimitive.Root style={styles.composer}>
					<ComposerPrimitive.Input multiline placeholder={t("dialogue_rule_placeholder")} placeholderTextColor={Colors.greys.grey6} style={styles.input} />
					<ComposerPrimitive.Send style={styles.send} disabled={!online}>
						<FontAwesome5 name="arrow-up" size={16} color={Colors.greys.grey10} />
					</ComposerPrimitive.Send>
				</ComposerPrimitive.Root>
			</ThreadPrimitive.Root>
		</AssistantRuntimeProvider>
	);
}

export default function CorrectionBranchScreen() {
	const { correctionId } = useLocalSearchParams<{ correctionId: string }>();
	const router = useRouter();
	const { t } = useTranslation();
	const { user } = useSessionUser();
	const [branch, setBranch] = useState<ExplanationBranch | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!correctionId || !user?.userId) return;
		let cancelled = false;
		const load = async () => {
			const cachedItems = await dialogueCacheRepository.list(user.userId);
			const cached = cachedItems.find((detail) => detail.corrections.some((item) => item.id === correctionId));
			const correction = cached?.corrections.find((item) => item.id === correctionId);
			const thread = cached?.threads.find((item) => item.correction_id === correctionId);
			if (cached && correction && thread) {
				setBranch({ correction, thread, messages: cached.messages.filter((item) => item.thread_id === thread.id) });
			}
			const network = await NetInfo.fetch();
			if (!network.isConnected) {
				if (!thread) setError(t("dialogue_branch_not_cached"));
				return;
			}
			try {
				const remote = await openCorrectionBranch(correctionId);
				if (cancelled) return;
				setBranch(remote);
				const base = (await dialogueCacheRepository.get(user.userId, remote.correction.session_id)) ?? cached;
				if (base) {
					const next: DialogueDetail = {
						...base,
						threads: [...base.threads.filter((item) => item.id !== remote.thread.id), remote.thread],
						messages: [...base.messages.filter((item) => item.thread_id !== remote.thread.id), ...remote.messages],
						corrections: [...base.corrections.filter((item) => item.id !== remote.correction.id), remote.correction],
					};
					await dialogueCacheRepository.upsert(user.userId, next);
				}
			} catch (loadError) {
				if (!cached) setError(loadError instanceof Error ? loadError.message : t("dialogue_branch_error"));
			}
		};
		void load();
		return () => { cancelled = true; };
	}, [correctionId, t, user?.userId]);

	return (
		<View style={styles.page}>
			<View style={styles.header}>
				<Pressable style={styles.back} onPress={() => router.back()}><FontAwesome5 name="chevron-left" color={Colors.greys.white} /></Pressable>
				<View style={{ flex: 1 }}>
					<WText weight="semibold">{t("dialogue_correction_review")}</WText>
					{branch ? <WText size="xs" mode="tertiary" numberOfLines={1}>{branch.correction.original} → {branch.correction.corrected}</WText> : null}
				</View>
			</View>
			{branch && user?.userId ? <BranchThread key={branch.thread.id} branch={branch} userId={user.userId} onBranchChange={setBranch} /> : <View style={styles.center}>{error ? <WText style={{ color: Colors.accents.red }} wrap>{error}</WText> : <ActivityIndicator color={Colors.primary.base} />}</View>}
		</View>
	);
}

const styles = StyleSheet.create({
	page: { flex: 1, backgroundColor: Colors.backgrounds.primaryBackground, paddingTop: 48 },
	header: { height: 60, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, borderBottomColor: Colors.dark.dark3, borderBottomWidth: 1 },
	back: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
	center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
	offline: { padding: 8, alignItems: "center", backgroundColor: Colors.dark.dark2 },
	messages: { padding: 16, gap: 14 },
	message: { maxWidth: "88%", padding: 14, borderRadius: 18 },
	assistant: { alignSelf: "flex-start", backgroundColor: Colors.dark.dark2, borderTopLeftRadius: 6 },
	user: { alignSelf: "flex-end", backgroundColor: Colors.dark.dark4, borderTopRightRadius: 6 },
	composer: { flexDirection: "row", alignItems: "flex-end", gap: 10, paddingHorizontal: 14, paddingVertical: 10, borderTopColor: Colors.dark.dark3, borderTopWidth: 1 },
	input: { flex: 1, minHeight: 46, maxHeight: 120, backgroundColor: Colors.dark.dark2, color: Colors.greys.white, borderRadius: 18, paddingHorizontal: 15, paddingVertical: 12, fontSize: 16 },
	send: { width: 46, height: 46, borderRadius: 23, backgroundColor: Colors.primary.base, alignItems: "center", justifyContent: "center" },
});
