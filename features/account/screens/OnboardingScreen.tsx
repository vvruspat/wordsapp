import { useOnboarding } from "../hooks/useOnboarding";
import SelectLanguageISpeakModal from "@/components/Modals/SelectLanguageISpeakModal";
import SelectLanguageToLearnModal from "@/components/Modals/SelectLanguageToLearnModal";
import { SelectLanguageButton } from "@/components/SelectLanguageButton";
import { WAlert, WButton, WInput, WText } from "@/mob-ui";
import {
	KeyboardAvoidingView,
	Platform,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { styles } from "@/general.styles";

export default function Onboarding() {
	const {
		isSelectLanguageISpeakModalVisible,
		setSelectLanguageISpeakModalVisible,
		isSelectLanguageToLearnModalVisible,
		setSelectLanguageToLearnModalVisible,
		languageISpeak,
		setLanguageISpeak,
		languageToLearn,
		setLanguageToLearn,
		error,
		t,
		handleContinueClick,
		onNameChange,
	} = useOnboarding();
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
