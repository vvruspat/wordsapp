import { AVAILABLE_LANGUAGES, Language } from "@repo/types";

export type LanguageItem = {
	name: (typeof AVAILABLE_LANGUAGES)[keyof typeof AVAILABLE_LANGUAGES];
	isoCode: Language;
	countryCode: string;
};

export const LANGUAGES: LanguageItem[] = [
	{ name: "English", isoCode: "en", countryCode: "US" },
	{ name: "Spanish", isoCode: "es", countryCode: "ES" },
	{ name: "French", isoCode: "fr", countryCode: "FR" },
	{ name: "German", isoCode: "de", countryCode: "DE" },
	{ name: "Italian", isoCode: "it", countryCode: "IT" },
	{ name: "Russian", isoCode: "ru", countryCode: "RU" },
	{ name: "Greek", isoCode: "el", countryCode: "GR" },
	{ name: "Dutch", isoCode: "nl", countryCode: "NL" },
] as const;
