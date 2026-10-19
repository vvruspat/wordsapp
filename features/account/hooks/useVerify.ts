import { useAccountOperation } from "./useAccountOperation";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { resendVerificationEmail, verifyEmail } from "@/api/auth";
import { useSessionUser } from "@/shared/session/useSession";

const PIN_LENGTH = 4;

export function useVerify() {
	const beginOperation = useAccountOperation();
	const router = useRouter();
	const { authUser } = useSessionUser();

	const { email } = useLocalSearchParams<{ email: string }>();
	const [error, setError] = useState<string>();
	const [isReadyToResend, setIsReadyToResend] = useState<boolean>(false);

	const { t } = useTranslation();

	const onCodeChangeHandler = async (text: string) => {
		const operation = beginOperation("onCodeChangeHandler");
		if (!operation) return;
		try {
			if (text.length === PIN_LENGTH) {
				try {
					const response = await verifyEmail({ code: text, email });
					if (!operation.current()) return;

					if (response.status === "error") {
						setError(response.error?.message ?? t("sign_in_error_generic"));
						return;
					}

					if (!response.data) {
						setError(t("verification_error_generic"));
						return;
					}

					const { access_token, refresh_token, user: userData } = response.data;

					const authenticated = await authUser(
						access_token,
						refresh_token,
						userData,
					);
					if (!authenticated || !operation.mounted()) return;

					if (!userData.onboarded) {
						router.replace("/onboarding");
					} else {
						router.replace("/authorized/learning");
					}
				} catch (e) {
					if (!operation.current()) return;
					setError((e as Error).message);
				}
			}
		} catch (error) {
			if (operation.current())
				setError(error instanceof Error ? error.message : String(error));
		} finally {
			operation.finish();
		}
	};

	const onCodeResendHandler = async () => {
		const operation = beginOperation("onCodeResendHandler");
		if (!operation) return;
		try {
			try {
				const response = await resendVerificationEmail(email);
				if (!operation.current()) return;

				if (response.status === "error") {
					setError(response.error?.message ?? t("sign_in_error_generic"));
					return;
				}

				setIsReadyToResend(false);
			} catch (e) {
				if (!operation.current()) return;
				setError((e as Error).message);
			}
		} catch (error) {
			if (operation.current())
				setError(error instanceof Error ? error.message : String(error));
		} finally {
			operation.finish();
		}
	};

	return {
		router,
		error,
		isReadyToResend,
		setIsReadyToResend,
		t,
		onCodeChangeHandler,
		onCodeResendHandler,
	};
}
