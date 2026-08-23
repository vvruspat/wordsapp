import {
	AssistantRuntimeProvider,
	type ChatModelAdapter,
	ComposerPrimitive,
	type ThreadMessageLike,
	ThreadPrimitive,
	useLocalRuntime,
} from "@assistant-ui/react-native";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import NetInfo from "@react-native-community/netinfo";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import type {
	DialogueCorrection,
	DialogueDetail,
	VocabularyResult,
} from "@/api/dialogues";
import {
	addDialogueWord,
	recordDialogueInteraction,
	sendDialogueMessage,
} from "@/api/dialogues";
import { dialogueCacheRepository } from "@/db/repositories/dialogueCache.repository";
import { dialogueVocabularyRepository } from "@/db/repositories/dialogueVocabulary.repository";
import { WText } from "@/mob-ui";
import { Colors } from "@/mob-ui/brand/colors";
import { CorrectionCard } from "./CorrectionCard";
import { TappableText } from "./TappableText";
import { VocabularyResultCard } from "./VocabularyResultCard";

type RenderMessage = {
	role: "user" | "assistant" | "system";
	content: ReadonlyArray<{ type: string; text?: string }>;
	metadata: { custom?: Record<string, unknown> };
	status?: { type: string };
};

const textOf = (message: RenderMessage) =>
	message.content
		.filter((part) => part.type === "text")
		.map((part) => part.text ?? "")
		.join("");

const id = () =>
	`${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;

const mergeById = <T extends { id: string }>(current: T[], incoming: T[]) => {
	const merged = new Map(current.map((item) => [item.id, item]));
	for (const item of incoming) merged.set(item.id, item);
	return [...merged.values()];
};

const initialMessages = (detail: DialogueDetail): ThreadMessageLike[] => {
	const main = detail.threads.find((thread) => thread.kind === "main");
	if (!main) return [];
	const messagesById = new Map(
		detail.messages.map((message) => [message.id, message]),
	);
	return detail.messages
		.filter(
			(message) => message.thread_id === main.id && message.role !== "system",
		)
		.sort((a, b) => a.sequence - b.sequence)
		.map((message) => {
			const corrections = detail.corrections.filter(
				(item) => item.assistant_message_id === message.id,
			);
			const correctionSource = corrections[0]
				? messagesById.get(corrections[0].message_id)?.content
				: undefined;
			return {
				id: message.id,
				role: message.role as "user" | "assistant",
				content: message.content,
				createdAt: new Date(message.created_at),
				metadata: {
					custom: {
						serverMessageId: message.id,
						translation: message.translation,
						hints: message.metadata.hints ?? [],
						corrections,
						correctionSource,
					},
				},
			};
		});
};

const DialogueMessageBubble = ({
	message,
	sessionId,
	onOpenBranch,
	onWordPress,
}: {
	message: RenderMessage;
	sessionId: string;
	onOpenBranch: (id: string) => void;
	onWordPress: (word: string, context: string, messageId?: string) => void;
}) => {
	const [showTranslation, setShowTranslation] = useState(false);
	const { t } = useTranslation();
	const [showHints, setShowHints] = useState(false);
	const translationRecorded = useRef(false);
	const hintsRecorded = useRef(false);
	const custom = message.metadata.custom ?? {};
	const translation = custom.translation as string | null | undefined;
	const hints = (custom.hints as string[] | undefined) ?? [];
	const corrections = (
		(custom.corrections as
			| Array<DialogueCorrection | null | undefined>
			| undefined) ?? []
	).filter((correction): correction is DialogueCorrection =>
		Boolean(
			correction?.id &&
				correction.original?.trim() &&
				correction.corrected?.trim(),
		),
	);
	const correctionSource = custom.correctionSource as string | undefined;
	const serverMessageId = custom.serverMessageId as string | undefined;
	const content = textOf(message);
	const isUser = message.role === "user";

	const toggleTranslation = () => {
		setShowTranslation((value) => !value);
		if (!translationRecorded.current) {
			translationRecorded.current = true;
			void recordDialogueInteraction(sessionId, "translation");
		}
	};

	const toggleHints = () => {
		setShowHints((value) => !value);
		if (!hintsRecorded.current) {
			hintsRecorded.current = true;
			void recordDialogueInteraction(sessionId, "hint");
		}
	};

	return (
		<View style={[styles.messageRow, isUser && styles.messageRowUser]}>
			<View
				style={[
					styles.bubble,
					isUser ? styles.userBubble : styles.teacherBubble,
				]}
			>
				{!isUser ? (
					<WText
						size="xs"
						weight="semibold"
						style={{ color: Colors.primary.base }}
					>
						{t("dialogue_teacher").toUpperCase()}
					</WText>
				) : null}
				<TappableText
					text={content}
					align={isUser ? "right" : "left"}
					onWordPress={
						isUser
							? undefined
							: (word) => onWordPress(word, content, serverMessageId)
					}
				/>
				{!content && message.status?.type === "running" ? (
					<ActivityIndicator color={Colors.primary.base} size="small" />
				) : null}
				{!isUser && translation ? (
					<View style={styles.revealBlock}>
						<Pressable style={styles.inlineAction} onPress={toggleTranslation}>
							<FontAwesome5
								name="language"
								size={13}
								color={Colors.greys.grey5}
							/>
							<WText size="xs" mode="secondary">
								{showTranslation
									? t("dialogue_hide_translation")
									: t("dialogue_show_translation")}
							</WText>
						</Pressable>
						{showTranslation ? (
							<WText size="sm" mode="secondary" wrap>
								{translation}
							</WText>
						) : null}
					</View>
				) : null}
				{!isUser && hints.length > 0 ? (
					<View style={styles.revealBlock}>
						<Pressable style={styles.inlineAction} onPress={toggleHints}>
							<FontAwesome5
								name="lightbulb"
								size={13}
								color={Colors.accents.orange}
							/>
							<WText size="xs" style={{ color: Colors.accents.orange }}>
								{showHints ? t("dialogue_hide_hint") : t("dialogue_hint")}
							</WText>
						</Pressable>
						{showHints
							? hints.map((hint) => (
									<WText key={hint} size="sm" mode="secondary" wrap>
										• {hint}
									</WText>
								))
							: null}
					</View>
				) : null}
			</View>
			{corrections.length > 0 && correctionSource ? (
				<CorrectionCard
					corrections={corrections}
					originalText={correctionSource}
					onOpenBranch={onOpenBranch}
				/>
			) : null}
		</View>
	);
};

const SummaryCard = ({ detail }: { detail: DialogueDetail }) => {
	const router = useRouter();
	const { t } = useTranslation();
	const summary = detail.session.summary;
	if (!summary) return null;
	const wordIds = summary.newWords.map((word) => word.wordId).filter(Boolean);

	return (
		<View style={styles.summaryCard}>
			<WText size="xl" weight="bold">
				{t("dialogue_completed")}
			</WText>
			<WText mode="secondary" wrap>
				{summary.encouragement}
			</WText>
			<View style={styles.summaryStat}>
				<WText size="2xl" weight="bold" style={{ color: Colors.primary.base }}>
					{summary.newWordsCount}
				</WText>
				<WText mode="secondary">{t("dialogue_new_words")}</WText>
			</View>
			{summary.strengths.map((item) => (
				<WText key={item} wrap>
					✓ {item}
				</WText>
			))}
			{summary.improvements.map((item) => (
				<WText key={item} mode="secondary" wrap>
					→ {item}
				</WText>
			))}
			{wordIds.length > 0 ? (
				<Pressable
					style={styles.primaryButton}
					onPress={() =>
						router.push({
							pathname: "/authorized/learning/mix-training",
							params: { wordIds: wordIds.join(",") },
						})
					}
				>
					<WText mode="inverted" weight="semibold">
						{t("dialogue_train_new_words")}
					</WText>
				</Pressable>
			) : null}
			<Pressable
				style={styles.secondaryButton}
				onPress={() => router.replace("/authorized/dialogues")}
			>
				<WText weight="semibold">{t("dialogue_choose_new")}</WText>
			</Pressable>
		</View>
	);
};

export const DialogueChat = ({
	detail,
	userId,
	onDetailChange,
}: {
	detail: DialogueDetail;
	userId: number;
	onDetailChange: (detail: DialogueDetail) => void;
}) => {
	const router = useRouter();
	const { t } = useTranslation();
	const [online, setOnline] = useState(true);
	const [wordNotice, setWordNotice] = useState<{
		message?: string;
		result?: VocabularyResult;
	} | null>(null);
	const detailRef = useRef(detail);
	detailRef.current = detail;

	useEffect(
		() =>
			NetInfo.addEventListener((state) =>
				setOnline(Boolean(state.isConnected)),
			),
		[],
	);

	const acceptVocabulary = useCallback(
		async (items: VocabularyResult[]) => {
			await dialogueVocabularyRepository.integrate(userId, items);
			return items;
		},
		[userId],
	);

	const model = useMemo<ChatModelAdapter>(
		() => ({
			async run({ messages }) {
				if (!online) throw new Error("No network connection");
				const last = messages.at(-1);
				if (!last || last.role !== "user")
					throw new Error("User message is missing");
				const content = last.content
					.filter((part) => part.type === "text")
					.map((part) => (part.type === "text" ? part.text : ""))
					.join("")
					.trim();
				const result = await sendDialogueMessage(
					detail.session.id,
					content,
					id(),
				);
				const addedWords = await acceptVocabulary(result.addedWords);
				const nativeInsertion = addedWords.find(
					(item) => item.source === "native_insert",
				);
				if (nativeInsertion) setWordNotice({ result: nativeInsertion });
				const previous = detailRef.current;
				const next: DialogueDetail = {
					...previous,
					session: result.session,
					messages: mergeById(previous.messages, [
						result.userMessage,
						result.assistantMessage,
					]),
					corrections: mergeById(previous.corrections, result.corrections),
				};
				detailRef.current = next;
				onDetailChange(next);
				await dialogueCacheRepository.upsert(userId, next);
				await dialogueCacheRepository.setDraft(userId, detail.session.id, "");
				return {
					content: [
						{ type: "text" as const, text: result.assistantMessage.content },
					],
					metadata: {
						custom: {
							serverMessageId: result.assistantMessage.id,
							translation: result.assistantMessage.translation,
							hints: result.assistantMessage.metadata.hints ?? [],
							corrections: result.corrections,
							correctionSource: result.userMessage.content,
						},
					},
				};
			},
		}),
		[acceptVocabulary, detail.session.id, online, onDetailChange, userId],
	);

	const runtime = useLocalRuntime(model, {
		initialMessages: initialMessages(detail),
	});

	useEffect(() => {
		let disposed = false;
		void dialogueCacheRepository
			.getDraft(userId, detail.session.id)
			.then((draft) => {
				if (!disposed && draft) runtime.thread.composer.setText(draft);
			});
		const unsubscribe = runtime.thread.composer.subscribe(() => {
			void dialogueCacheRepository.setDraft(
				userId,
				detail.session.id,
				runtime.thread.composer.getState().text,
			);
		});
		return () => {
			disposed = true;
			unsubscribe();
		};
	}, [detail.session.id, runtime, userId]);

	const addWord = useCallback(
		async (word: string, context: string, messageId?: string) => {
			if (!online) {
				setWordNotice({ message: t("dialogue_word_offline") });
				return;
			}
			setWordNotice({ message: t("dialogue_word_adding", { word }) });
			try {
				const result = await addDialogueWord(detail.session.id, {
					word,
					context,
					messageId,
				});
				await acceptVocabulary(result);
				const first = result[0];
				setWordNotice(first ? { result: first } : null);
			} catch (error) {
				setWordNotice({
					message:
						error instanceof Error ? error.message : t("dialogue_word_error"),
				});
			}
		},
		[acceptVocabulary, detail.session.id, online, t],
	);

	return (
		<AssistantRuntimeProvider runtime={runtime}>
			<ThreadPrimitive.Root style={styles.root}>
				{!online ? (
					<View style={styles.offlineBanner}>
						<FontAwesome5 name="wifi" color={Colors.accents.orange} size={12} />
						<WText size="xs" style={{ color: Colors.accents.orange }}>
							{t("dialogue_offline_draft")}
						</WText>
					</View>
				) : null}
				<ThreadPrimitive.MessagesFlatList
					style={{ flex: 1 }}
					contentContainerStyle={styles.messages}
					keyboardShouldPersistTaps="handled"
					ListFooterComponent={<SummaryCard detail={detail} />}
				>
					{({ message }) => (
						<DialogueMessageBubble
							message={message}
							sessionId={detail.session.id}
							onOpenBranch={(correctionId) =>
								router.push({
									pathname: "/authorized/dialogues/branch/[correctionId]",
									params: { correctionId },
								})
							}
							onWordPress={addWord}
						/>
					)}
				</ThreadPrimitive.MessagesFlatList>
				{wordNotice ? (
					<VocabularyResultCard
						result={wordNotice.result}
						message={wordNotice.message}
						onClose={() => setWordNotice(null)}
					/>
				) : null}
				{detail.session.status === "active" ? (
					<ComposerPrimitive.Root style={styles.composer}>
						<ComposerPrimitive.Input
							placeholder={
								online
									? t("dialogue_reply_placeholder")
									: t("dialogue_draft_placeholder")
							}
							placeholderTextColor={Colors.greys.grey6}
							multiline
							style={styles.input}
						/>
						<ComposerPrimitive.Send style={styles.send} disabled={!online}>
							{({ pressed }) =>
								pressed ? (
									<ActivityIndicator color={Colors.greys.grey10} />
								) : (
									<FontAwesome5
										name="arrow-up"
										size={16}
										color={Colors.greys.grey10}
									/>
								)
							}
						</ComposerPrimitive.Send>
					</ComposerPrimitive.Root>
				) : null}
			</ThreadPrimitive.Root>
		</AssistantRuntimeProvider>
	);
};

const styles = StyleSheet.create({
	root: { flex: 1 },
	offlineBanner: {
		flexDirection: "row",
		gap: 8,
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 7,
		backgroundColor: Colors.dark.dark2,
	},
	messages: { paddingHorizontal: 16, paddingVertical: 18, gap: 16 },
	messageRow: { maxWidth: "88%", alignSelf: "flex-start" },
	messageRowUser: { alignSelf: "flex-end", alignItems: "flex-end" },
	bubble: {
		borderRadius: 20,
		paddingHorizontal: 16,
		paddingVertical: 13,
		gap: 7,
	},
	teacherBubble: { backgroundColor: Colors.dark.dark2, borderTopLeftRadius: 6 },
	userBubble: { backgroundColor: Colors.dark.dark4, borderTopRightRadius: 6 },
	revealBlock: {
		borderTopColor: Colors.dark.dark4,
		borderTopWidth: 1,
		paddingTop: 8,
		gap: 6,
	},
	inlineAction: { flexDirection: "row", gap: 7, alignItems: "center" },
	composer: {
		flexDirection: "row",
		gap: 10,
		alignItems: "flex-end",
		paddingHorizontal: 14,
		paddingTop: 10,
		paddingBottom: 12,
		borderTopWidth: 1,
		borderTopColor: Colors.dark.dark3,
		backgroundColor: Colors.backgrounds.primaryBackground,
	},
	input: {
		flex: 1,
		minHeight: 46,
		maxHeight: 120,
		paddingHorizontal: 15,
		paddingVertical: 12,
		color: Colors.greys.white,
		backgroundColor: Colors.dark.dark2,
		borderRadius: 18,
		fontSize: 16,
	},
	send: {
		width: 46,
		height: 46,
		borderRadius: 23,
		backgroundColor: Colors.primary.base,
		alignItems: "center",
		justifyContent: "center",
	},
	summaryCard: {
		marginTop: 8,
		borderRadius: 22,
		padding: 20,
		backgroundColor: Colors.dark.dark2,
		borderColor: Colors.primary.disabled,
		borderWidth: 1,
		gap: 12,
	},
	summaryStat: { flexDirection: "row", alignItems: "baseline", gap: 8 },
	primaryButton: {
		minHeight: 48,
		borderRadius: 15,
		backgroundColor: Colors.primary.base,
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 14,
	},
	secondaryButton: {
		minHeight: 48,
		borderRadius: 15,
		backgroundColor: Colors.dark.dark4,
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 14,
	},
});
