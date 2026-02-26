import { $fetch } from "@/utils/fetch";

export const getTrainings = (query: { offset: number; limit: number }) =>
	$fetch("/training", "get", { query });
