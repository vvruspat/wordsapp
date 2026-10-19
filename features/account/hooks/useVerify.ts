import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { resendVerificationEmail, verifyEmail } from "@/api/auth";
import { useSessionUser } from "@/hooks/useSession";

const PIN_LENGTH = 4;

export function useVerify() {
	const router = useRouter();
	const { authUser } = useSessionUser();

	const { email } = useLocalSearchParams<{ email: string }>();
	const [error, setError] = useState<string>();
	const [isReadyToResend, setIsReadyToResend] = useState<boolean>(false);

	const { t } = useTranslation();

	const onCodeChangeHandler = async (text: string) => {
		if (text.length === PIN_LENGTH) {
			try {
				const response = await verifyEmail({ code: text, email });

				if (response.status === "error") {
					setError(response.error?.message ?? t("sign_in_error_generic"));
					return;
				}

				if (!response.data) {
					setError(t("verification_error_generic"));
					return;
				}

				const { access_token, refresh_token, user: userData } = response.data;

				await authUser(access_token, refresh_token, userData);

				if (!userData.onboarded) {
					router.replace("/onboarding");
				} else {
					router.replace("/authorized/learning");
				}
			} catch (e) {
				setError((e as Error).message);
			}
		}
	};

	const onCodeResendHandler = async () => {
		try {
			const response = await resendVerificationEmail(email);

			if (response.status === "error") {
				setError(response.error?.message ?? t("sign_in_error_generic"));
				return;
			}

			setIsReadyToResend(false);
		} catch (e) {
			setError((e as Error).message);
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
