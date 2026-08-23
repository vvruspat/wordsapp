import { getAccessToken } from "@/utils/authTokenStorage";

export type DialogueSession = {
	id: string;
	created_at: string;
	updated_at: string;
	completed_at?: string | null;
	user: number;
	language_learn: string;
	language_speak: string;
	scenario_title: string;
	scenario_description?: string | null;
	custom_topic?: string | null;
	difficulty_level: string;
	status: "active" | "completed";
	turn_count: number;
	target_turns: number;
	max_turns: number;
	metrics: Record<string, number>;
	summary?: DialogueSummary | null;
};

export type DialogueThread = {
	id: string;
	created_at: string;
	session_id: string;
	kind: "main" | "explanation";
	correction_id?: string | null;
	title: string;
};

export type DialogueMessage = {
	id: string;
	created_at: string;
	thread_id: string;
	client_message_id?: string | null;
	role: "user" | "assistant" | "system";
	content: string;
	translation?: string | null;
	sequence: number;
	status: "pending" | "complete" | "error";
	model_id?: string | null;
	metadata: {
		hints?: string[];
		shouldWrapUp?: boolean;
		shouldComplete?: boolean;
		respondingTo?: string;
		[key: string]: unknown;
	};
};

export type DialogueCorrection = {
	id: string;
	created_at: string;
	session_id: string;
	message_id: string;
	assistant_message_id: string;
	type: "typo" | "grammar" | "vocabulary";
	original: string;
	corrected: string;
	short_explanation: string;
	metadata: Record<string, unknown>;
};

export type DialogueSummary = {
	strengths: string[];
	improvements: string[];
	encouragement: string;
	newWordsCount: number;
	newWords: Array<{
		id: string;
		wordId: number;
		word: string;
		description?: string;
	}>;
	correctedWords: Array<{
		original: string;
		corrected: string;
		type: DialogueCorrection["type"];
	}>;
};

export type DialogueDetail = {
	session: DialogueSession;
	threads: DialogueThread[];
	messages: DialogueMessage[];
	corrections: DialogueCorrection[];
};

export type DialogueScenario = {
	title: string;
	description: string;
	openingLine: string;
	estimatedMinutes: number;
};

export type VocabularyResult = {
	source: "click" | "native_insert" | "correction" | "manual";
	item: {
		id: string;
		word: number;
		source: "click" | "native_insert" | "correction" | "manual";
	};
	word: {
		id: number;
		created_at: string;
		word: string;
		topic: number;
		catalog: number;
		language: string;
		meaning?: string;
		audio?: string;
		transcription: string;
		status: string;
	};
	translation: {
		id: number;
		created_at: string;
		word: number;
		translation: string;
		language: string;
	};
	progress: {
		intro: DialogueLearningProgress;
		writing: DialogueLearningProgress | null;
	};
	isNew: boolean;
};

export type DialogueLearningProgress = {
	id: number;
	created_at: string;
	last_review: string;
	word: number;
	translation: number;
	training: string;
	score: number;
};

type StartResponse = {
	session: DialogueSession;
	thread: DialogueThread;
	message: DialogueMessage;
	corrections: DialogueCorrection[];
};

export type SendMessageResponse = {
	session: DialogueSession;
	userMessage: DialogueMessage;
	assistantMessage: DialogueMessage;
	corrections: DialogueCorrection[];
	addedWords: VocabularyResult[];
};

export type ExplanationBranch = {
	thread: DialogueThread;
	correction: DialogueCorrection;
	messages: DialogueMessage[];
};

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
		const error = (data && typeof data === "object"
			? (data as Record<string, unknown>).error
			: undefined) as
			| { message?: string; details?: Record<string, unknown> }
			| undefined;
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
		body: JSON.stringify({ content, clientMessageId }),
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
	}>(`/dialogues/threads/${threadId}/messages`, {
		method: "POST",
		body: JSON.stringify({ content, clientMessageId }),
	});

export const deleteDialogue = (sessionId: string) =>
	request<{ id: string }>(`/dialogues/${sessionId}`, { method: "DELETE" });
