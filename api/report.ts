import { $fetch } from "@/utils/fetch";

export const createReport = (body: {
	word: number;
	type: "word" | "translation" | "audio";
	description?: string;
}) => $fetch("/report", "post", { body });
