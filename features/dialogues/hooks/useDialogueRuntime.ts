import { useOperationScope } from "@/shared/lifecycle/useOperationScope";
import { logger } from "@/utils/logger";
import {
	type ChatModelAdapter,
	type ThreadMessageLike,
	useLocalRuntime,
} from "@assistant-ui/react-native";
import NetInfo from "@react-native-community/netinfo";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { DialogueDetail } from "@/features/dialogues/model/types";
import type { VocabularyResult } from "@/shared/vocabulary/dialogueVocabulary";
import {
	addDialogueWord,
	sendDialogueMessage,
} from "@/features/dialogues/api/dialogues";
import { dialogueCacheRepository } from "@/features/dialogues/services/dialogueCache";
import { dialogueVocabularyRepository } from "@/shared/vocabulary/integrateDialogueVocabulary";

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
						teacherNote: message.metadata.teacherNote,
						hints: message.metadata.hints ?? [],
						focusWords: message.metadata.focusWords ?? [],
						corrections,
						correctionSource,
						correctedAnswer: message.metadata.correctedAnswer,
					},
				},
			};
		});
};

export function useDialogueRuntime(
	detail: DialogueDetail,
	userId: number,
	onDetailChange: (detail: DialogueDetail) => void,
) {
	const begin = useOperationScope(`${userId}:${detail.session.id}`);
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
				const current = begin();
				if (!online) throw new Error("No network connection");
				const last = messages.at(-1);
				if (last?.role !== "user") throw new Error("User message is missing");
				const content = last.content
					.filter((part) => part.type === "text")
					.map((part) => (part.type === "text" ? part.text : ""))
					.join("")
					.trim();
				const result = await sendDialogueMessage(
					detail.session.id,
					content,
					last.id ?? id(),
				);
				if (!current()) throw new Error("Dialogue session changed");
				const addedWords = await acceptVocabulary(result.addedWords);
				if (!current()) throw new Error("Dialogue session changed");
				const savedWord =
					addedWords.find((item) => item.source === "native_insert") ??
					addedWords[0];
				if (savedWord) setWordNotice({ result: savedWord });
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
							teacherNote: result.assistantMessage.metadata.teacherNote,
							hints: result.assistantMessage.metadata.hints ?? [],
							focusWords: result.assistantMessage.metadata.focusWords ?? [],
							corrections: result.corrections,
							correctionSource: result.userMessage.content,
							correctedAnswer: result.assistantMessage.metadata.correctedAnswer,
						},
					},
				};
			},
		}),
		[
			acceptVocabulary,
			detail.session.id,
			online,
			onDetailChange,
			userId,
			begin,
		],
	);

	const runtime = useLocalRuntime(model, {
		initialMessages: initialMessages(detail),
	});

	useEffect(() => {
		let disposed = false;
		void dialogueCacheRepository
			.getDraft(userId, detail.session.id)
			.then((draft) => {
				if (!disposed && draft && !runtime.thread.composer.getState().text)
					runtime.thread.composer.setText(draft);
			})
			.catch((error) =>
				logger.error("Unable to restore dialogue draft", error, "db"),
			);
		const unsubscribe = runtime.thread.composer.subscribe(() => {
			void dialogueCacheRepository
				.setDraft(
					userId,
					detail.session.id,
					runtime.thread.composer.getState().text,
				)
				.catch((error) =>
					logger.error("Unable to persist dialogue draft", error, "db"),
				);
		});
		return () => {
			disposed = true;
			unsubscribe();
		};
	}, [detail.session.id, runtime, userId]);

	const addWord = useCallback(
		async (word: string, context: string, messageId?: string) => {
			const current = begin();
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
				if (!current()) return;
				await acceptVocabulary(result);
				if (!current()) return;
				const first = result[0];
				setWordNotice(first ? { result: first } : null);
			} catch (error) {
				if (!current()) return;
				setWordNotice({
					message:
						error instanceof Error ? error.message : t("dialogue_word_error"),
				});
			}
		},
		[acceptVocabulary, detail.session.id, online, t, begin],
	);

	return { router, t, online, wordNotice, setWordNotice, runtime, addWord };
}
