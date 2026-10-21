import { useBranchRuntime } from "../hooks/useBranchRuntime";
import {
	AssistantRuntimeProvider,
	ComposerPrimitive,
	ThreadPrimitive,
} from "@assistant-ui/react-native";
import { View } from "react-native";
import type { ExplanationBranch } from "@/features/dialogues/model/types";
import { TappableText } from "@/features/dialogues/components/TappableText";
import { VocabularyResultCard } from "@/features/dialogues/components/VocabularyResultCard";
import { WText } from "@/mob-ui";
import { Colors } from "@/mob-ui/brand/colors";
import { DialogueReplyFeedback } from "./DialogueReplyFeedback";
import { DialogueSendButton } from "./DialogueSendButton";

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
	const { t, online, notice, setNotice, runtime, addWord } = useBranchRuntime(
		branch,
		userId,
		onBranchChange,
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
								<DialogueReplyFeedback
									status={message.status}
									onRetry={
										online
											? () => {
													if (!runtime.thread.getState().isRunning)
														runtime.thread.getMessageById(message.id).reload();
												}
											: undefined
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
					<DialogueSendButton style={styles.send} online={online} />
				</ComposerPrimitive.Root>
			</ThreadPrimitive.Root>
		</AssistantRuntimeProvider>
	);
}

import { styles } from "./branch.styles";
