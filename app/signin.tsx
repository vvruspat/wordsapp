import { useSessionUser } from "@/hooks/useSession";
import { WButton, WInput, WText } from "@/mob-ui";
import { $fetch } from "@/utils/fetch";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Text, TextInputChangeEvent, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { styles } from "../general.styles";

export default function SignIn() {
	const { authUser } = useSessionUser();

	const [password, setPassword] = useState("");
	const [email, setEmail] = useState("");
	const [error, setError] = useState<string>();
	const [stage, setStage] = useState<"email" | "password">("email");

	const { t } = useTranslation();

	const handleContinueClick = async () => {
		try {
			await $fetch("/auth/tmp-password", "post", {
				body: {
					email,
				},
			});

			setStage("password");
		} catch (e) {
			setError((e as Error).message);
		}
	};

	const handleSignInClick = async () => {
		try {
			const response = await $fetch("/auth/signin", "post", {
				body: {
					email,
					password,
				},
			});

			if (!response?.data) {
				setError(t("sign_in_error_generic"));
				return;
			}

			const incomeUserData = response.data.user;

			const accessToken = response?.data?.access_token;
			const refreshToken = response?.data?.refresh_token;

			if (!accessToken || !refreshToken) {
				setError(t("sign_in_error_generic"));
				return;
			}

			await authUser(accessToken, refreshToken, incomeUserData);
		} catch (e) {
			setError((e as Error).message);
		}
	};

	const onPasswordChange = (e: TextInputChangeEvent) => {
		const text = e.nativeEvent.text;

		setPassword(text);
	};

	const onEmailChange = (e: TextInputChangeEvent) => {
		const text = e.nativeEvent.text;

		setEmail(text);
	};

	return (
		<SafeAreaView mode="padding" style={styles.page}>
			<View style={styles.formWrapper}>
				{error && (
					<WText mode="primary" size="lg" weight="bold" align="center">
						{error}
					</WText>
				)}

				{stage === "email" && (
					<WText mode="primary" size="3xl" weight="bold" align="center">
						{t("sign_in_message")}
					</WText>
				)}

				{stage === "password" && (
					<WText mode="primary" size="3xl" weight="bold" align="center">
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
		</SafeAreaView>
	);
}
