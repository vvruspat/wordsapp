import { signIn as apiSignIn, requestTmpPassword } from "@/api/auth";
import { useApiError } from "@/hooks/useApiError";
import { useSessionUser } from "@/hooks/useSession";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { TextInputChangeEvent } from "react-native";

export function useSignIn() {
	const { authUser } = useSessionUser();
	const router = useRouter();

	const [password, setPassword] = useState("");
	const [email, setEmail] = useState("");
	const [error, setError] = useState<string>();
	const [stage, setStage] = useState<"email" | "password">("email");

	const { t } = useTranslation();
	const { getErrorMessage } = useApiError();

	const handleContinueClick = async () => {
		const response = await requestTmpPassword(email);

		if (response.status === "error") {
			setError(
				getErrorMessage(response.error?.message) ?? t("sign_in_error_generic"),
			);
			return;
		}

		setStage("password");
	};

	const handleSignInClick = async () => {
		try {
			const response = await apiSignIn({ email, password });

			if (response.status === "error") {
				setError(
					getErrorMessage(response.error?.message) ??
						t("sign_in_error_generic"),
				);
				return;
			}

			const incomeUserData = response.data?.user;
			const accessToken = response.data?.access_token;
			const refreshToken = response.data?.refresh_token;

			if (!accessToken || !refreshToken) {
				setError(t("sign_in_error_generic"));
				return;
			}

			if (!incomeUserData) {
				setError(t("sign_in_error_generic"));
				return;
			}

			await authUser(accessToken, refreshToken, incomeUserData);
			router.replace("/authorized/learning");
		} catch (e) {
			setError(getErrorMessage((e as Error).message));
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

	const handleBack = () => {
		if (stage === "password") {
			setStage("email");
		} else {
			router.back();
		}
	};

	return {
		error,
		stage,
		t,
		handleContinueClick,
		handleSignInClick,
		onPasswordChange,
		onEmailChange,
		handleBack,
	};
}
