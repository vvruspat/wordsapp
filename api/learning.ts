import { $fetch } from "@/utils/fetch";

export const createLearning = (body: {
	user: number;
	word: number;
	score: number;
	last_review: string;
	created_at: string;
	training: string;
	translation: number;
}) => $fetch("/learning", "post", { body });

export const updateLearning = (body: {
	id: number;
	score: number;
	last_review: string;
	training: string;
	translation: number;
}) => $fetch("/learning", "put", { body });

export const getLearning = (query: {
	user?: number;
	offset: number;
	limit: number;
}) => $fetch("/learning", "get", { query });
