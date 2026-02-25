import * as Localization from "expo-localization";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import de from "./locales/de.json";
import el from "./locales/el.json";
import en from "./locales/en.json";
import es from "./locales/es.json";
import fr from "./locales/fr.json";
import it from "./locales/it.json";
import nl from "./locales/nl.json";
import ru from "./locales/ru.json";

const locales = Localization.getLocales();
const deviceLanguage = locales[0]?.languageCode ?? "en";

i18n.use(initReactI18next).init({
	compatibilityJSON: "v4",
	lng: deviceLanguage,
	fallbackLng: "en",
	resources: {
		de: { translation: de },
		el: { translation: el },
		en: { translation: en },
		es: { translation: es },
		fr: { translation: fr },
		it: { translation: it },
		nl: { translation: nl },
		ru: { translation: ru },
	},
	interpolation: {
		escapeValue: false,
	},
});

export default i18n;
