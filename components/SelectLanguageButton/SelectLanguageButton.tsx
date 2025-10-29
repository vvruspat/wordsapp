import { LANGUAGES, LanguageItem } from "@/constants/languages";
import { WText } from "@/mob-ui";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, View } from "react-native";
import CountryFlag from "react-native-country-flag";
import { styles } from "./SelectLanguageButton.styles";

export type SelectLanguageButtonProps = {
	label: string;
	languageValue: LanguageItem["isoCode"];
	onPress: () => void;
};

export const SelectLanguageButton = ({
	label,
	languageValue,
	onPress,
}: SelectLanguageButtonProps) => {
	const language = useMemo(
		() => LANGUAGES.find((l) => l.isoCode === languageValue) || LANGUAGES[0],
		[languageValue],
	);

	const { t } = useTranslation();

	return (
		<Pressable onPress={onPress}>
			<View>
				<WText mode="secondary" size="sm" weight="medium">
					{label}
				</WText>
				<View style={styles.buttonContainer}>
					<View style={styles.flag}>
						<CountryFlag isoCode={language.countryCode} size={48} />
					</View>
					<View>
						<WText>{t(language.name)}</WText>
					</View>
				</View>
			</View>
		</Pressable>
	);
};
