import { useSignUp } from "../hooks/useSignUp";
import { WAlert, WButton, WInput, WText } from "@/mob-ui";
import {
	KeyboardAvoidingView,
	Platform,
	ScrollView,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { styles } from "@/general.styles";
import { SocialSignInButtons } from "../components/SocialSignInButtons";

export default function SignUp() {
	const {
		error,
		t,
		handleContinueClick,
		onEmailChange,
		handleSocialSignIn,
		pendingProvider,
		isBusy,
	} = useSignUp();
	return (
		<SafeAreaView mode="padding" style={styles.page}>
			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : "height"}
				style={{ flex: 1, width: "100%" }}
			>
				<ScrollView
					style={{ width: "100%" }}
					contentContainerStyle={{ flexGrow: 1 }}
					keyboardShouldPersistTaps="handled"
				>
					<View style={[styles.formWrapper, entryStyles.wrapper]}>
						<View style={entryStyles.header}>
							<WText mode="primary" size="2xl" weight="bold" align="center">
								{t("sign_up_message")}
							</WText>
							{error && <WAlert mode="error">{error}</WAlert>}
						</View>
						<View style={styles.fieldsGroup}>
							<WInput
								autoCapitalize="none"
								autoCorrect={false}
								keyboardType="email-address"
								placeholder="example@domain.com"
								label={t("label_email")}
								onChange={onEmailChange}
							/>
						</View>

						<View style={{ gap: 24, width: "100%" }}>
							<WButton
								mode="primary"
								fullWidth
								onPress={handleContinueClick}
								disabled={isBusy}
							>
								<Text>{t("button_continue")}</Text>
							</WButton>
						</View>
						<SocialSignInButtons
							isBusy={isBusy}
							pendingProvider={pendingProvider}
							onSignIn={handleSocialSignIn}
						/>
					</View>
				</ScrollView>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
}

const entryStyles = StyleSheet.create({
	wrapper: {
		gap: 24,
		paddingVertical: 16,
	},
	header: {
		gap: 12,
		width: "100%",
	},
});
