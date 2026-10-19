import { useProfile } from "../hooks/useProfile";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import SelectLanguageISpeakModal from "@/components/Modals/SelectLanguageISpeakModal";
import SelectLanguageToLearnModal from "@/components/Modals/SelectLanguageToLearnModal";
import { SelectLanguageButton } from "@/components/SelectLanguageButton";
import { WAlert, WButton, WInput, WText } from "@/mob-ui";
import { styles } from "@/general.styles";

export default function Profile() {
	const {
		t,
		i18n,
		user,
		name,
		setName,
		email,
		setEmail,
		languageISpeak,
		setLanguageISpeak,
		languageToLearn,
		setLanguageToLearn,
		isSelectLanguageISpeakModalVisible,
		setSelectLanguageISpeakModalVisible,
		isSelectLanguageToLearnModalVisible,
		setSelectLanguageToLearnModalVisible,
		isSaving,
		isLoggingOut,
		error,
		success,
		handleSave,
		handleVerifyEmail,
		handleLogout,
	} = useProfile();
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

				<View style={profileStyles.actions}>
					<WButton
						mode="primary"
						fullWidth
						onPress={handleSave}
						disabled={isSaving}
					>
						<Text>{t("profile_save_button")}</Text>
					</WButton>
					<WButton
						mode="dark"
						fullWidth
						onPress={handleLogout}
						disabled={isLoggingOut}
					>
						<Text>{t("profile_logout_button")}</Text>
					</WButton>
				</View>
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
	actions: {
		gap: 12,
		width: "100%",
	},
});
