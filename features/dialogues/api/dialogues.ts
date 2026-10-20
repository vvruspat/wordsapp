import { getAccessToken } from "@/utils/authTokenStorage";

import type {
	DialogueSession,
	DialogueMessage,
	DialogueDetail,
	DialogueScenario,
	SendMessageResponse,
	ExplanationBranch,
	StartResponse,
} from "@/features/dialogues/model/types";
import type { VocabularyResult } from "@/shared/vocabulary/dialogueVocabulary";
export class DialogueApiError extends Error {
	constructor(
		message: string,
		readonly status: number,
		readonly details?: Record<string, unknown>,
	) {
		super(message);
	}
}

const server = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "");

// assistant-ui creates seven-character IDs; the API requires 8–100 characters.
// Preserve established IDs and use a deterministic prefix so retries reuse a key.
const clientMessageKey = (id: string) => (id.length < 8 ? `message:${id}` : id);

const request = async <T>(
	path: string,
	options: RequestInit = {},
): Promise<T> => {
	if (!server) throw new DialogueApiError("API server is not configured", 500);
	const token = await getAccessToken();
	if (!token) throw new DialogueApiError("Authentication required", 401);

	let response: Response;
	try {
		response = await fetch(`${server}${path}`, {
			...options,
			headers: {
				Authorization: `Bearer ${token}`,
				...(options.body ? { "Content-Type": "application/json" } : {}),
				...options.headers,
			},
		});
	} catch {
		throw new DialogueApiError("No network connection", 0);
	}

	const text = await response.text();
	// Nest responds with an empty body when a controller returns null. Preserve
	// that meaning instead of turning it into a truthy object (which used to
	// create a phantom active dialogue on first use).
	const data = text ? (JSON.parse(text) as unknown) : null;
	if (!response.ok) {
		const error = (
			data && typeof data === "object"
				? (data as Record<string, unknown>).error
				: undefined
		) as { message?: string; details?: Record<string, unknown> } | undefined;
		throw new DialogueApiError(
			error?.message || response.statusText || "Request failed",
			response.status,
			error?.details,
		);
	}
	return data as T;
};

export const getDialogueRecommendations = () =>
	request<{ scenarios: DialogueScenario[] }>("/dialogues/recommendations");

export const getActiveDialogue = () =>
	request<DialogueSession | null>("/dialogues/active").then((session) =>
		session?.id ? session : null,
	);

export const getDialogueHistory = () =>
	request<DialogueSession[]>("/dialogues");

export const getDialogueDetail = (sessionId: string) =>
	request<DialogueDetail>(`/dialogues/${sessionId}`);

export const startDialogue = async (input: {
	title?: string;
	description?: string;
	customTopic?: string;
}): Promise<DialogueDetail> => {
	const result = await request<StartResponse>("/dialogues", {
		method: "POST",
		body: JSON.stringify(input),
	});
	return {
		session: result.session,
		threads: [result.thread],
		messages: [result.message],
		corrections: result.corrections,
	};
};

export const sendDialogueMessage = (
	sessionId: string,
	content: string,
	clientMessageId: string,
) =>
	request<SendMessageResponse>(`/dialogues/${sessionId}/messages`, {
		method: "POST",
		body: JSON.stringify({
			content,
			clientMessageId: clientMessageKey(clientMessageId),
		}),
	});

export const addDialogueWord = (
	sessionId: string,
	input: { word: string; context: string; messageId?: string },
) =>
	request<VocabularyResult[]>(`/dialogues/${sessionId}/words`, {
		method: "POST",
		body: JSON.stringify(input),
	});

export const recordDialogueInteraction = (
	sessionId: string,
	type: "hint" | "translation",
) =>
	request<DialogueSession>(`/dialogues/${sessionId}/interactions`, {
		method: "POST",
		body: JSON.stringify({ type }),
	});

export const completeDialogue = (sessionId: string) =>
	request<DialogueSession>(`/dialogues/${sessionId}/complete`, {
		method: "POST",
	});

export const openCorrectionBranch = (correctionId: string) =>
	request<ExplanationBranch>(`/dialogues/corrections/${correctionId}/branch`, {
		method: "POST",
	});

export const sendBranchMessage = (
	threadId: string,
	content: string,
	clientMessageId: string,
) =>
	request<{
		userMessage: DialogueMessage;
		assistantMessage: DialogueMessage;
		addedWords?: VocabularyResult[];
	}>(`/dialogues/threads/${threadId}/messages`, {
		method: "POST",
		body: JSON.stringify({
			content,
			clientMessageId: clientMessageKey(clientMessageId),
		}),
	});

export const deleteDialogue = (sessionId: string) =>
	request<{ id: string }>(`/dialogues/${sessionId}`, { method: "DELETE" });
