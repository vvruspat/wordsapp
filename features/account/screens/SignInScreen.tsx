import { useSignIn } from "../hooks/useSignIn";
import { WAlert, WButton, WInput, WText } from "@/mob-ui";
import { AntDesign } from "@expo/vector-icons";
import {
	KeyboardAvoidingView,
	Platform,
	Pressable,
	Text,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { styles } from "@/general.styles";

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
				<View style={styles.formWrapper}>
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
							<WButton mode="primary" fullWidth onPress={handleContinueClick}>
								<Text>{t("button_continue")}</Text>
							</WButton>
						)}

						{stage === "password" && (
							<WButton mode="primary" fullWidth onPress={handleSignInClick}>
								<Text>{t("button_sign_in")}</Text>
							</WButton>
						)}
					</View>
				</View>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
}
