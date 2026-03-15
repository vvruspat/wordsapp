import { useDatabase } from "@nozbe/watermelondb/hooks";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { resendVerificationEmail } from "@/api/auth";
import { updateUser } from "@/api/user";
import SelectLanguageISpeakModal from "@/components/Modals/SelectLanguageISpeakModal";
import SelectLanguageToLearnModal from "@/components/Modals/SelectLanguageToLearnModal";
import { SelectLanguageButton } from "@/components/SelectLanguageButton";
import { LanguageItem } from "@/constants/languages";
import { useSessionUser } from "@/hooks/useSession";
import { WAlert, WButton, WInput, WText } from "@/mob-ui";
import { styles } from "../../general.styles";

export default function Profile() {
	const { t, i18n } = useTranslation();
	const router = useRouter();
	const database = useDatabase();
	const currentUser = useSessionUser();
	const user = currentUser?.user;

	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [languageISpeak, setLanguageISpeak] =
		useState<LanguageItem["isoCode"]>("en");
	const [languageToLearn, setLanguageToLearn] =
		useState<LanguageItem["isoCode"]>("nl");

	const [
		isSelectLanguageISpeakModalVisible,
		setSelectLanguageISpeakModalVisible,
	] = useState(false);
	const [
		isSelectLanguageToLearnModalVisible,
		setSelectLanguageToLearnModalVisible,
	] = useState(false);

	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState<string>();
	const [success, setSuccess] = useState(false);

	useEffect(() => {
		if (user) {
			setName(user.name);
			setEmail(user.email);
			setLanguageISpeak(user.language_speak as LanguageItem["isoCode"]);
			setLanguageToLearn(user.language_learn as LanguageItem["isoCode"]);
		}
	}, [user]);

	const handleSave = async () => {
		if (!user) return;

		setIsSaving(true);
		setError(undefined);
		setSuccess(false);

		try {
			const response = await updateUser({
				id: user.userId,
				name,
				email,
				language_speak: languageISpeak,
				language_learn: languageToLearn,
				email_verified: user.email_verified ?? false,
			});

			if (response.status === "error") {
				setError(response.error?.message ?? t("profile_save_error"));
				return;
			}

			await database.write(async () => {
				await user.update((u) => {
					u.name = name;
					u.email = email;
					u.language_speak = languageISpeak;
					u.language_learn = languageToLearn;
				});
			});

			setSuccess(true);
		} catch (e) {
			setError((e as Error).message);
		} finally {
			setIsSaving(false);
		}
	};

	const handleVerifyEmail = async () => {
		if (!user?.email) return;

		setError(undefined);

		try {
			await resendVerificationEmail();

			router.push({
				pathname: "/verify",
				params: { email: user.email },
			});
		} catch (e) {
			setError((e as Error).message);
		}
	};

	return (
		<SafeAreaView mode="padding" style={styles.page}>
			<ScrollView
				style={profileStyles.scroll}
				contentContainerStyle={profileStyles.scrollContent}
				keyboardShouldPersistTaps="handled"
			>
				<WText mode="primary" size="2xl" weight="bold">
					{t("profile_title")}
				</WText>

				{error && <WAlert mode="error">{error}</WAlert>}

				{success && <WAlert mode="success">{t("profile_save_success")}</WAlert>}

				<View style={profileStyles.section}>
					<WInput
						label={t("label_name")}
						value={name}
						onChangeText={setName}
						autoCorrect={false}
						placeholder={t("placeholder_name")}
					/>

					<View style={profileStyles.section}>
						<WInput
							label={t("label_email")}
							value={email}
							onChangeText={setEmail}
							autoCapitalize="none"
							autoCorrect={false}
							keyboardType="email-address"
							placeholder="example@domain.com"
						/>

						{!user?.email_verified && (
							<View style={profileStyles.verifyRow}>
								<WText mode="secondary" size="sm">
									{t("profile_email_not_verified")}
								</WText>
								<WText onPress={handleVerifyEmail}>
									<Text>{t("profile_verify_email_button")}</Text>
								</WText>
							</View>
						)}
					</View>

					{user?.email_verified && (
						<WText mode="secondary" size="sm">
							{t("profile_email_verified")}
						</WText>
					)}
				</View>

				<View style={profileStyles.section}>
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
				</View>

				<WButton
					mode="primary"
					fullWidth
					onPress={handleSave}
					disabled={isSaving}
				>
					<Text>{t("profile_save_button")}</Text>
				</WButton>
			</ScrollView>

			<SelectLanguageISpeakModal
				visible={isSelectLanguageISpeakModalVisible}
				languageValue={languageISpeak}
				onClose={() => setSelectLanguageISpeakModalVisible(false)}
				onSelect={(isoCode) => {
					setLanguageISpeak(isoCode);
					i18n.changeLanguage(isoCode);
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
		</SafeAreaView>
	);
}

const profileStyles = StyleSheet.create({
	scroll: {
		width: "100%",
	},
	scrollContent: {
		gap: 36,
		paddingBottom: 32,
	},
	section: {
		gap: 32,
		width: "100%",
	},
	verifyRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
});
