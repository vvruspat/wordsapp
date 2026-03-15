import { AntDesign } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { KeyboardAvoidingView, Platform, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { resendVerificationEmail, verifyEmail } from "@/api/auth";
import { WAlert, WButton, WCharInput, WText, WTimer } from "@/mob-ui";
import { styles } from "../general.styles";

const PIN_LENGTH = 4;

export default function Verify() {
	const router = useRouter();

	const { email } = useLocalSearchParams<{ email: string }>();
	const [error, setError] = useState<string>();
	const [isReadyToResend, setIsReadyToResend] = useState<boolean>(false);

	const { t } = useTranslation();

	const onCodeChangeHandler = async (text: string) => {
		if (text.length === PIN_LENGTH) {
			try {
				await verifyEmail({ code: text, email });

				router.push("/authorized/learning");
			} catch (e) {
				setError((e as Error).message);
			}
		}
	};

	const onCodeResendHandler = async () => {
		try {
			await resendVerificationEmail();

			setIsReadyToResend(false);
		} catch (e) {
			setError((e as Error).message);
		}
	};

	return (
		<SafeAreaView mode="padding" style={styles.page}>
			<Pressable onPress={() => router.back()} style={{ padding: 8 }}>
				<AntDesign name="arrow-left" size={24} color="white" />
			</Pressable>
			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : "height"}
				style={{ flex: 1, width: "100%" }}
			>
				<View style={styles.formWrapper}>
					{error && <WAlert mode="error">{error}</WAlert>}

					<WText mode="primary" size="2xl" align="center">
						{t("verify_enter_code")}
					</WText>

					<WCharInput
						length={PIN_LENGTH}
						secureTextEntry={false}
						keyboardType="visible-password"
						onChangeText={onCodeChangeHandler}
					/>

					{!isReadyToResend && (
						<WTimer
							mode="primary"
							duration={180}
							onComplete={() => setIsReadyToResend(true)}
						/>
					)}

					<View style={{ gap: 24, width: "100%" }}>
						<WButton
							mode="tertiary"
							onPress={onCodeResendHandler}
							disabled={!isReadyToResend}
						>
							<Text>{t("resend_code")}</Text>
						</WButton>

						<WButton mode="secondary" onPress={() => router.push("/")}>
							<Text>{t("skip_verification")}</Text>
						</WButton>
					</View>
				</View>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
}
