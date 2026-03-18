import { updateUser } from "@/api/user";
import SelectLanguageISpeakModal from "@/components/Modals/SelectLanguageISpeakModal";
import SelectLanguageToLearnModal from "@/components/Modals/SelectLanguageToLearnModal";
import { SelectLanguageButton } from "@/components/SelectLanguageButton";
import { LanguageItem } from "@/constants/languages";
import { useAuthContext } from "@/context/AuthContext";
import User from "@/db/models/User";
import { useApiError } from "@/hooks/useApiError";
import { useSessionUser } from "@/hooks/useSession";
import { WAlert, WButton, WInput, WText } from "@/mob-ui";
import { Q } from "@nozbe/watermelondb";
import { useDatabase } from "@nozbe/watermelondb/hooks";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
	KeyboardAvoidingView,
	Platform,
	StyleSheet,
	Text,
	TextInputChangeEvent,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { styles } from "../general.styles";

export default function Onboarding() {
	const { triggerBiometricAuth } = useAuthContext();
	const { user } = useSessionUser();
	const database = useDatabase();

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
	const [error, setError] = useState<string>();

	const { t, i18n } = useTranslation();
	const { getErrorMessage } = useApiError();

	useEffect(() => {
		i18n.changeLanguage(languageISpeak);
	}, [languageISpeak, i18n]);

	const handleContinueClick = async () => {
		try {
			const response = await updateUser({
				id: user?.userId,
				name,
				language_speak: languageISpeak,
				language_learn: languageToLearn,
				email_verified: user?.email_verified ?? false,
				onboarded: true,
			});

			if (response.status === "error") {
				setError(
					getErrorMessage(response.error?.message) ??
						t("sign_up_error_generic"),
				);
				return;
			}

			// Update the local WatermelonDB record
			if (user) {
				await database.write(async () => {
					const usersCollection = database.get<User>("users");
					const records = await usersCollection
						.query(Q.where("user_id", user.userId))
						.fetch();
					if (records[0]) {
						const record = await usersCollection.find(records[0].id);
						await record.update((u) => {
							u.name = name;
							u.language_speak = languageISpeak;
							u.language_learn = languageToLearn;
							u.onboarded = true;
						});
					}
				});
			}

			triggerBiometricAuth();
		} catch (e) {
			setError(getErrorMessage((e as Error).message));
		}
	};

	const onNameChange = (e: TextInputChangeEvent) => {
		setName(e.nativeEvent.text);
	};

	return (
		<SafeAreaView mode="padding" style={styles.page}>
			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : "height"}
				style={{ flex: 1, width: "100%" }}
			>
				<View style={[styles.formWrapper, onboardingStyles.wrapper]}>
					<View style={onboardingStyles.header}>
						<WText mode="primary" size="2xl" weight="bold" align="center">
							{t("sign_up_message")}
						</WText>
						{error && <WAlert mode="error">{error}</WAlert>}
					</View>
					<View style={styles.fieldsGroup}>
						<WInput
							autoCorrect={false}
							placeholder={t("placeholder_name")}
							label={t("label_name")}
							onChange={onNameChange}
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

					<View style={{ gap: 24, width: "100%" }}>
						<WButton mode="primary" fullWidth onPress={handleContinueClick}>
							<Text>{t("button_continue")}</Text>
						</WButton>
					</View>
				</View>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
}

const onboardingStyles = StyleSheet.create({
	wrapper: {
		gap: 24,
	},
	header: {
		gap: 12,
		width: "100%",
	},
});
