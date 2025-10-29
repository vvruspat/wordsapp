export const LANGUAGES = [
	{ name: "English", isoCode: "en", countryCode: "US" },
	{ name: "Spanish", isoCode: "es", countryCode: "ES" },
	{ name: "Dutch", isoCode: "nl", countryCode: "NL" },
	{ name: "French", isoCode: "fr", countryCode: "FR" },
	{ name: "German", isoCode: "de", countryCode: "DE" },
	{ name: "Russian", isoCode: "ru", countryCode: "RU" },
	{ name: "Portuguese", isoCode: "pt", countryCode: "PT" },
	{ name: "Arabic", isoCode: "ar", countryCode: "SA" },
] as const;

export type LanguageItem = (typeof LANGUAGES)[number];
