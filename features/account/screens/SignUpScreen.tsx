import { useSignUp } from "../hooks/useSignUp";
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

export default function SignUp() {
	const { error, t, handleContinueClick, onEmailChange } = useSignUp();
	return (
		<SafeAreaView mode="padding" style={styles.page}>
			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : "height"}
				style={{ flex: 1, width: "100%" }}
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
						<WButton mode="primary" fullWidth onPress={handleContinueClick}>
							<Text>{t("button_continue")}</Text>
						</WButton>
					</View>
				</View>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
}

const entryStyles = StyleSheet.create({
	wrapper: {
		gap: 24,
	},
	header: {
		gap: 12,
		width: "100%",
	},
});
