import { $fetch } from "@/utils/fetch";

export const createLearning = (body: {
	user: number;
	word: number;
	score: number;
	last_review: string;
	created_at: string;
	training: number;
	translation: number;
}) => $fetch("/learning", "post", { body });

export const getLearning = (query: {
	user?: number;
	offset: number;
	limit: number;
}) => $fetch("/learning", "get", { query });
