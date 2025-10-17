import { WButton, WCharInput, WText, WTimer } from "@/mob-ui";
import { $fetch } from "@/utils/fetch";
import { authenticateAsync } from "expo-local-authentication";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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
				await $fetch("/auth/verify-email", "post", {
					body: { code: text, email },
				});

				const result = await authenticateAsync({
					promptMessage: "Authenticate to access the app",
				});

				if (!result.success) {
					router.push("/");
				} else {
					router.push("/authorized/learning");
				}
			} catch (e) {
				setError((e as Error).message);
			}
		}
	};

	const onCodeResendHandler = async () => {
		try {
			await $fetch("/auth/verify-email/resend", "post", {
				body: { email },
			});

			setIsReadyToResend(false);
		} catch (e) {
			setError((e as Error).message);
		}
	};

	return (
		<SafeAreaView mode="padding" style={styles.page}>
			<View style={styles.formWrapper}>
				{error && <WText mode="primary">{error}</WText>}

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
		</SafeAreaView>
	);
}
