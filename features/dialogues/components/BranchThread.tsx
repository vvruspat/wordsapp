import { useOperationScope } from "@/shared/lifecycle/useOperationScope";
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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import type { ExplanationBranch } from "@/features/dialogues/model/types";
import type { VocabularyResult } from "@/shared/vocabulary/dialogueVocabulary";
import {
	addDialogueWord,
	sendBranchMessage,
} from "@/features/dialogues/api/dialogues";
import { TappableText } from "@/features/dialogues/components/TappableText";
import { VocabularyResultCard } from "@/features/dialogues/components/VocabularyResultCard";
import { dialogueCacheRepository } from "@/features/dialogues/services/dialogueCache";
import { dialogueVocabularyRepository } from "@/shared/vocabulary/integrateDialogueVocabulary";
import { WText } from "@/mob-ui";
import { Colors } from "@/mob-ui/brand/colors";

const makeId = () =>
	`${Date.now()}-${Math.random().toString(36).slice(2)}-branch`;

const toInitialMessages = (branch: ExplanationBranch): ThreadMessageLike[] =>
	branch.messages
		.filter((message) => message.role !== "system")
		.sort((a, b) => a.sequence - b.sequence)
		.map((message) => ({
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
	message.content
		.map((part) => (part.type === "text" ? (part.text ?? "") : ""))
		.join("");

export function BranchThread({
	branch,
	userId,
	onBranchChange,
}: {
	branch: ExplanationBranch;
	userId: number;
	onBranchChange: (branch: ExplanationBranch) => void;
}) {
	const begin = useOperationScope(`${userId}:${branch.thread.id}`);
	const [online, setOnline] = useState(true);
	const { t } = useTranslation();
	const [notice, setNotice] = useState<{
		message?: string;
		result?: VocabularyResult;
	} | null>(null);
	const branchRef = useRef(branch);
	branchRef.current = branch;

	useEffect(
		() =>
			NetInfo.addEventListener((state) =>
				setOnline(Boolean(state.isConnected)),
			),
		[],
	);

	const model = useMemo<ChatModelAdapter>(
		() => ({
			async run({ messages }) {
				const current = begin();
				if (!online) throw new Error("No network connection");
				const last = messages.at(-1);
				if (last?.role !== "user") throw new Error("User message is missing");
				const content = last.content
					.map((part) => (part.type === "text" ? part.text : ""))
					.join("");
				const response = await sendBranchMessage(
					branch.thread.id,
					content,
					last.id ?? makeId(),
				);
				if (!current()) throw new Error("Dialogue branch changed");
				if (response.addedWords?.length) {
					await dialogueVocabularyRepository.integrate(
						userId,
						response.addedWords,
					);
					if (!current()) throw new Error("Dialogue branch changed");
					setNotice({ result: response.addedWords[0] });
				}
				const next = {
					...branchRef.current,
					messages: [
						...branchRef.current.messages,
						response.userMessage,
						response.assistantMessage,
					],
				};
				branchRef.current = next;
				onBranchChange(next);
				const cached = await dialogueCacheRepository.get(
					userId,
					branch.correction.session_id,
				);
				if (cached) {
					await dialogueCacheRepository.upsert(userId, {
						...cached,
						messages: [
							...cached.messages.filter(
								(message) => message.thread_id !== branch.thread.id,
							),
							...next.messages,
						],
					});
				}
				return {
					content: [
						{ type: "text" as const, text: response.assistantMessage.content },
					],
					metadata: {
						custom: { serverMessageId: response.assistantMessage.id },
					},
				};
			},
		}),
		[
			begin,
			branch.correction.session_id,
			branch.thread.id,
			onBranchChange,
			online,
			userId,
		],
	);

	const initialMessages = useMemo(() => toInitialMessages(branch), [branch]);
	const runtime = useLocalRuntime(model, { initialMessages });
	useEffect(() => {
		const state = runtime.thread.getState();
		if (state.isRunning) return;
		if (
			state.messages.length === initialMessages.length &&
			state.messages.every(
				(message, index) => message.id === initialMessages[index].id,
			)
		)
			return;
		// initialMessages only seeds useLocalRuntime once; cache refreshes arrive later.
		runtime.thread.reset(initialMessages);
	}, [initialMessages, runtime]);

	const addWord = useCallback(
		async (word: string, context: string, messageId?: string) => {
			if (!online) {
				setNotice({ message: t("dialogue_word_offline") });
				return;
			}
			setNotice({ message: t("dialogue_word_adding", { word }) });
			try {
				const results = await addDialogueWord(branch.correction.session_id, {
					word,
					context,
					messageId,
				});
				await dialogueVocabularyRepository.integrate(userId, results);
				setNotice(results[0] ? { result: results[0] } : null);
			} catch (error) {
				setNotice({
					message:
						error instanceof Error ? error.message : t("dialogue_word_error"),
				});
			}
		},
		[branch.correction.session_id, online, t, userId],
	);

	return (
		<AssistantRuntimeProvider runtime={runtime}>
			<ThreadPrimitive.Root style={{ flex: 1 }}>
				{!online ? (
					<View style={styles.offline}>
						<WText size="xs" style={{ color: Colors.accents.orange }}>
							{t("dialogue_offline_send")}
						</WText>
					</View>
				) : null}
				<ThreadPrimitive.MessagesFlatList
					style={{ flex: 1 }}
					contentContainerStyle={styles.messages}
					keyboardShouldPersistTaps="handled"
				>
					{({ message }) => {
						const content = getText(message);
						const serverMessageId = message.metadata.custom?.serverMessageId as
							| string
							| undefined;
						return (
							<View
								style={[
									styles.message,
									message.role === "user" ? styles.user : styles.assistant,
								]}
							>
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
				{notice ? (
					<VocabularyResultCard
						result={notice.result}
						message={notice.message}
						onClose={() => setNotice(null)}
					/>
				) : null}
				<ComposerPrimitive.Root style={styles.composer}>
					<ComposerPrimitive.Input
						multiline
						placeholder={t("dialogue_rule_placeholder")}
						placeholderTextColor={Colors.greys.grey6}
						style={styles.input}
					/>
					<ComposerPrimitive.Send style={styles.send} disabled={!online}>
						<FontAwesome5
							name="arrow-up"
							size={16}
							color={Colors.greys.grey10}
						/>
					</ComposerPrimitive.Send>
				</ComposerPrimitive.Root>
			</ThreadPrimitive.Root>
		</AssistantRuntimeProvider>
	);
}

import { styles } from "./branch.styles";
