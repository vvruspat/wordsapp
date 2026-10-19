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
		teacherNote?: string;
		hints?: string[];
		focusWords?: string[];
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

import type { VocabularyResult } from "@/shared/vocabulary/dialogueVocabulary";
export type StartResponse = {
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
