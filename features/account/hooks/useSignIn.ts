import { useAccountOperation } from "./useAccountOperation";
import { signIn as apiSignIn, requestTmpPassword } from "@/api/auth";
import { useApiError } from "@/shared/localization/useApiError";
import { useSessionUser } from "@/shared/session/useSession";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { TextInputChangeEvent } from "react-native";

export function useSignIn() {
	const beginOperation = useAccountOperation();
	const { authUser } = useSessionUser();
	const router = useRouter();

	const [password, setPassword] = useState("");
	const [email, setEmail] = useState("");
	const [error, setError] = useState<string>();
	const [stage, setStage] = useState<"email" | "password">("email");

	const { t } = useTranslation();
	const { getErrorMessage } = useApiError();

	const handleContinueClick = async () => {
		const operation = beginOperation("handleContinueClick");
		if (!operation) return;
		try {
			const response = await requestTmpPassword(email);
			if (!operation.current()) return;

			if (response.status === "error") {
				setError(
					getErrorMessage(response.error?.message) ??
						t("sign_in_error_generic"),
				);
				return;
			}

			setStage("password");
		} catch (error) {
			if (operation.current())
				setError(error instanceof Error ? error.message : String(error));
		} finally {
			operation.finish();
		}
	};

	const handleSignInClick = async () => {
		const operation = beginOperation("handleSignInClick");
		if (!operation) return;
		try {
			try {
				const response = await apiSignIn({ email, password });
				if (!operation.current()) return;

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

				const authenticated = await authUser(
					accessToken,
					refreshToken,
					incomeUserData,
				);
				if (!authenticated || !operation.mounted()) return;
				router.replace("/authorized/learning");
			} catch (e) {
				if (!operation.current()) return;
				setError(getErrorMessage((e as Error).message));
			}
		} catch (error) {
			if (operation.current())
				setError(error instanceof Error ? error.message : String(error));
		} finally {
			operation.finish();
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
