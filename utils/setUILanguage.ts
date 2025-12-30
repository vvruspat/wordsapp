import { LANGUAGES, type LanguageItem } from "@/constants/languages";
import i18n from "@/i18n";

export const setUILanguage = (isoCode: LanguageItem["isoCode"]) => {
	console.log("setUILanguage", isoCode);
	const languageItem = LANGUAGES.find((l) => l.isoCode === isoCode);
	console.log("languageItem", languageItem);
	if (languageItem) {
		const languageTag = `${languageItem.isoCode}-${languageItem.countryCode}`;
		console.log("languageTag", languageTag);
		i18n.changeLanguage(languageTag);
	}
};
