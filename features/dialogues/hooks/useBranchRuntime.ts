import { useOperationScope } from "@/shared/lifecycle/useOperationScope";
import NetInfo from "@react-native-community/netinfo";
import {
	type ChatModelAdapter,
	type ThreadMessageLike,
	useLocalRuntime,
} from "@assistant-ui/react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ExplanationBranch } from "@/features/dialogues/model/types";
import type { VocabularyResult } from "@/shared/vocabulary/dialogueVocabulary";
import {
	addDialogueWord,
	sendBranchMessage,
} from "@/features/dialogues/api/dialogues";
import { dialogueCacheRepository } from "@/features/dialogues/services/dialogueCache";
import { dialogueVocabularyRepository } from "@/shared/vocabulary/integrateDialogueVocabulary";

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

export function useBranchRuntime(
	branch: ExplanationBranch,
	userId: number,
	onBranchChange: (branch: ExplanationBranch) => void,
) {
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
			const current = begin();
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
				if (!current()) return;
				await dialogueVocabularyRepository.integrate(userId, results);
				if (!current()) return;
				setNotice(results[0] ? { result: results[0] } : null);
			} catch (error) {
				if (!current()) return;
				setNotice({
					message:
						error instanceof Error ? error.message : t("dialogue_word_error"),
				});
			}
		},
		[branch.correction.session_id, online, t, userId, begin],
	);

	return { t, online, notice, setNotice, runtime, addWord };
}
