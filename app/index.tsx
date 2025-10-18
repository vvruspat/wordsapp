import SelectLanguageISpeakModal from "@/components/Modals/SelectLanguageISpeakModal";
import SelectLanguageToLearnModal from "@/components/Modals/SelectLanguageToLearnModal";
import { SelectLanguageButton } from "@/components/SelectLanguageButton";
import { LANGUAGES, LanguageItem } from "@/constants/languages";
import { WButton, WInput, WText } from "@/mob-ui";
import { $fetch } from "@/utils/fetch";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Text, TextInputChangeEvent, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { styles } from "../general.styles";

export default function SignUp() {
	const router = useRouter();

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

	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [error, setError] = useState<string>();

	const { t, i18n } = useTranslation();

	const handleContinueClick = async () => {
		try {
			const response = await $fetch("/auth/signup", "post", {
				body: {
					name,
					email,
					language_speak: languageISpeak,
					language_learn: languageToLearn,
				},
			});

			const accessToken = response?.data?.access_token;
			const refreshToken = response?.data?.refresh_token;

			if (!accessToken || !refreshToken) {
				setError(t("sign_up_error_generic"));
				return;
			}

			await SecureStore.setItemAsync("access_token", accessToken);
			await SecureStore.setItemAsync("refresh_token", refreshToken);

			router.push({ pathname: "/verify", params: { email } });
		} catch (e) {
			setError((e as Error).message);
		}
	};

	const onNameChange = (e: TextInputChangeEvent) => {
		const text = e.nativeEvent.text;

		setName(text);
	};

	const onEmailChange = (e: TextInputChangeEvent) => {
		const text = e.nativeEvent.text;

		setEmail(text);
	};

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
				{error && (
					<WText mode="primary" size="lg" weight="bold" align="center">
						{error}
					</WText>
				)}
				<WText mode="primary" size="3xl" weight="bold" align="center">
					{t("sign_up_message")}
				</WText>
				<View style={styles.fieldsGroup}>
					<WInput
						autoCorrect={false}
						placeholder={t("placeholder_name")}
						label={t("label_name")}
						onChange={onNameChange}
					/>
					<WInput
						autoCapitalize="none"
						autoCorrect={false}
						keyboardType="email-address"
						placeholder="example@domain.com"
						label={t("label_email")}
						onChange={onEmailChange}
					/>

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
					<Text>{t("button_sign_up")}</Text>
				</WButton>

				<WButton
					mode="tertiary"
					fullWidth
					onPress={() => router.push({ pathname: "/signin" })}
				>
					<Text>{t("button_sign_in")}</Text>
				</WButton>
			</View>
		</SafeAreaView>
	);
}

// const signUpStyles = StyleSheet.create({});
