import type { Language } from "@vvruspat/words-types";
import { $fetch } from "@/utils/fetch";

export const getCatalogs = (query: {
	offset: number;
	limit: number;
	language?: Language;
}) => $fetch("/vocabcatalog", "get", { query });

export const getTopics = (query: {
	offset: number;
	limit: number;
	language?: Language;
}) => $fetch("/topic", "get", { query });

export const getWords = (query: {
	offset: number;
	limit: number;
	language?: Language;
}) => $fetch("/word", "get", { query });

export const getWordTranslations = (query: {
	words?: string;
	offset: number;
	limit: number;
	language?: Language;
}) => $fetch("/words-translation", "get", { query });

export const getTopicTranslations = (query: {
	topics?: string;
	offset: number;
	limit: number;
	language?: Language;
}) => $fetch("/topic-translation", "get", { query });
