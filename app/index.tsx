import { requestTmpPassword } from "@/api/auth";
import { useApiError } from "@/hooks/useApiError";
import { WAlert, WButton, WInput, WText } from "@/mob-ui";
import { useRouter } from "expo-router";
import { useState } from "react";
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

export default function SignUp() {
	const router = useRouter();

	const [email, setEmail] = useState("");
	const [error, setError] = useState<string>();

	const { t } = useTranslation();
	const { getErrorMessage } = useApiError();

	const handleContinueClick = async () => {
		try {
			const response = await requestTmpPassword(email);

			if (response.status === "error") {
				setError(
					getErrorMessage(response.error?.message) ??
						t("sign_up_error_generic"),
				);
				return;
			}

			router.push({ pathname: "/verify", params: { email } });
		} catch (e) {
			setError(getErrorMessage((e as Error).message));
		}
	};

	const onEmailChange = (e: TextInputChangeEvent) => {
		setEmail(e.nativeEvent.text);
	};

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
