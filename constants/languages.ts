import { t } from "i18next";

export const LANGUAGES = [
	{ name: t("English"), isoCode: "en", countryCode: "US" },
	{ name: t("Spanish"), isoCode: "es", countryCode: "ES" },
	{ name: t("Dutch"), isoCode: "nl", countryCode: "NL" },
	{ name: t("French"), isoCode: "fr", countryCode: "FR" },
	{ name: t("German"), isoCode: "de", countryCode: "DE" },
	{ name: t("Russian"), isoCode: "ru", countryCode: "RU" },
	{ name: t("Japanese"), isoCode: "ja", countryCode: "JP" },
	{ name: t("Portuguese"), isoCode: "pt", countryCode: "PT" },
	{ name: t("Arabic"), isoCode: "ar", countryCode: "SA" },
	{ name: t("Hindi"), isoCode: "hi", countryCode: "IN" },
] as const;

export type LanguageItem = (typeof LANGUAGES)[number];
