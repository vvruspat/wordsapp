import SelectLanguageISpeakModal from "@/components/Modals/SelectLanguageISpeakModal";
import SelectLanguageToLearnModal from "@/components/Modals/SelectLanguageToLearnModal";
import { SelectLanguageButton } from "@/components/SelectLanguageButton";
import { LANGUAGES, LanguageItem } from "@/constants/languages";
import { WButton, WInput, WText } from "@/mob-ui";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { styles } from "../general.styles";

export default function SignUp() {
	const router = useRouter();

	const { t, i18n } = useTranslation();

	const handleContinueClick = () => {
		// send email
		router.push("/verify");
	};

	const [
		isSelectLanguageISpeakModalVisible,
		setSelectLanguageISpeakModalVisible,
	] = useState(false);
	const [
		isSelectLanguageToLearnModalVisible,
		setSelectLanguageToLearnModalVisible,
	] = useState(false);
	const [languageISpeak, setLanguageISpeak] =
		useState<LanguageItem["isoCode"]>("en");
	const [languageToLearn, setLanguageToLearn] =
		useState<LanguageItem["isoCode"]>("nl");

	useEffect(() => {
		const languageItem = LANGUAGES.find((l) => l.isoCode === languageISpeak);

		if (languageItem) {
			const languageTag = `${languageItem.isoCode}-${languageItem.countryCode}`;
			i18n.changeLanguage(languageTag);
		}
	}, [languageISpeak, i18n]);

	return (
		<SafeAreaView mode="padding" style={styles.page}>
			<View style={styles.formWrapper}>
				<WText mode="primary" size="3xl" weight="bold" align="center">
					{t("sign_up_message")}
				</WText>
				<View style={styles.fieldsGroup}>
					<WInput placeholder={t("placeholder_name")} label={t("label_name")} />
					<WInput placeholder="example@domain.com" label={t("label_email")} />

					<SelectLanguageButton
						label={t("language_i_speak_label")}
						languageValue={languageISpeak}
						onPress={() => setSelectLanguageISpeakModalVisible(true)}
					/>

					<SelectLanguageButton
						label={t("language_i_learn_label")}
						languageValue={languageToLearn}
						onPress={() => setSelectLanguageToLearnModalVisible(true)}
					/>

					<SelectLanguageISpeakModal
						visible={isSelectLanguageISpeakModalVisible}
						languageValue={languageISpeak}
						onClose={() => setSelectLanguageISpeakModalVisible(false)}
						onSelect={(isoCode) => {
							setLanguageISpeak(isoCode);
							setSelectLanguageISpeakModalVisible(false);
						}}
					/>
					<SelectLanguageToLearnModal
						visible={isSelectLanguageToLearnModalVisible}
						languageValue={languageToLearn}
						onClose={() => setSelectLanguageToLearnModalVisible(false)}
						onSelect={(isoCode) => {
							setLanguageToLearn(isoCode);
							setSelectLanguageToLearnModalVisible(false);
						}}
					/>
				</View>
				<WButton mode="primary" fullWidth onPress={handleContinueClick}>
					<Text>{t("button_continue")}</Text>
				</WButton>
			</View>
		</SafeAreaView>
	);
}

// const signUpStyles = StyleSheet.create({});
