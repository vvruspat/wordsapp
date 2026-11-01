import { useAccountOperation } from "./useAccountOperation";
import { requestTmpPassword } from "@/api/auth";
import { useApiError } from "@/shared/localization/useApiError";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { TextInputChangeEvent } from "react-native";
import { useSocialSignIn } from "./useSocialSignIn";
import type { SocialProvider } from "@/shared/session/socialAuth";

export function useSignUp() {
	const beginOperation = useAccountOperation();
	const social = useSocialSignIn(beginOperation);
	const [emailPending, setEmailPending] = useState(false);
	const router = useRouter();

	const [email, setEmail] = useState("");
	const [error, setError] = useState<string>();

	const { t } = useTranslation();
	const { getErrorMessage } = useApiError();

	const handleContinueClick = async () => {
		const operation = beginOperation("authentication");
		if (!operation) return;
		setError(undefined);
		social.clearError();
		setEmailPending(true);
		try {
			try {
				const response = await requestTmpPassword(email);
				if (!operation.current()) return;

				if (response.status === "error") {
					setError(
						getErrorMessage(response.error?.message) ??
							t("sign_up_error_generic"),
					);
					return;
				}

				router.push({ pathname: "/verify", params: { email } });
			} catch (e) {
				if (!operation.current()) return;
				setError(getErrorMessage((e as Error).message));
			}
		} catch (error) {
			if (operation.current())
				setError(error instanceof Error ? error.message : String(error));
		} finally {
			if (operation.mounted()) setEmailPending(false);
			operation.finish();
		}
	};

	const onEmailChange = (e: TextInputChangeEvent) => {
		setEmail(e.nativeEvent.text);
	};

	const handleSocialSignIn = (provider: SocialProvider) => {
		setError(undefined);
		return social.signIn(provider);
	};
	return {
		error: social.error ?? error,
		t,
		handleContinueClick,
		onEmailChange,
		handleSocialSignIn,
		pendingProvider: social.pendingProvider,
		isBusy: emailPending || social.pendingProvider !== null,
	};
}
