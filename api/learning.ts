import { $fetch } from "@/utils/fetch";

export const createLearning = (body: {
	user: number;
	word: number;
	score: number;
	last_review: string;
	created_at: string;
	training: string;
	translation: number;
}) => $fetch("/learning", "post", { body: body as never });

export const updateLearning = (body: {
	id: number;
	score: number;
	last_review: string;
	training: string;
	translation: number;
}) => $fetch("/learning", "put", { body: body as never });

export const getLearning = (query: {
	user?: number;
	offset: number;
	limit: number;
}) => $fetch("/learning", "get", { query });
