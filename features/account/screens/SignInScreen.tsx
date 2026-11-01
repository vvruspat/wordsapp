import { useSignIn } from "../hooks/useSignIn";
import { WAlert, WButton, WInput, WText } from "@/mob-ui";
import { AntDesign } from "@expo/vector-icons";
import {
	KeyboardAvoidingView,
	Platform,
	Pressable,
	ScrollView,
	Text,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { styles } from "@/general.styles";
import { SocialSignInButtons } from "../components/SocialSignInButtons";

export default function SignIn() {
	const {
		error,
		stage,
		t,
		handleContinueClick,
		handleSignInClick,
		onPasswordChange,
		onEmailChange,
		handleBack,
		handleSocialSignIn,
		pendingProvider,
		isBusy,
	} = useSignIn();
	return (
		<SafeAreaView mode="padding" style={styles.page}>
			<Pressable onPress={handleBack} style={{ padding: 8 }}>
				<AntDesign name="arrow-left" size={24} color="white" />
			</Pressable>
			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : "height"}
				style={{ flex: 1, width: "100%" }}
			>
				<ScrollView
					style={{ width: "100%" }}
					contentContainerStyle={{ flexGrow: 1 }}
					keyboardShouldPersistTaps="handled"
				>
					<View style={[styles.formWrapper, { gap: 24, paddingVertical: 16 }]}>
						{error && <WAlert mode="error">{error}</WAlert>}

						{stage === "email" && (
							<WText mode="primary" size="2xl" weight="bold" align="center">
								{t("sign_in_message")}
							</WText>
						)}

						{stage === "password" && (
							<WText mode="primary" size="2xl" weight="bold" align="center">
								{t("sign_in_password_message")}
							</WText>
						)}

						<View style={styles.fieldsGroup}>
							{stage === "email" && (
								<WInput
									autoCapitalize="none"
									autoCorrect={false}
									keyboardType="email-address"
									placeholder="example@domain.com"
									label={t("label_email")}
									onChange={onEmailChange}
								/>
							)}

							{stage === "password" && (
								<WInput
									autoCorrect={false}
									secureTextEntry
									placeholder={t("placeholder_password")}
									label={t("label_password")}
									onChange={onPasswordChange}
								/>
							)}
						</View>

						<View style={{ gap: 24, width: "100%" }}>
							{stage === "email" && (
								<WButton
									mode="primary"
									fullWidth
									onPress={handleContinueClick}
									disabled={isBusy}
								>
									<Text>{t("button_continue")}</Text>
								</WButton>
							)}

							{stage === "password" && (
								<WButton
									mode="primary"
									fullWidth
									onPress={handleSignInClick}
									disabled={isBusy}
								>
									<Text>{t("button_sign_in")}</Text>
								</WButton>
							)}
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
