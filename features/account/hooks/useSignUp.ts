import { requestTmpPassword } from "@/api/auth";
import { useApiError } from "@/hooks/useApiError";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { TextInputChangeEvent } from "react-native";

export function useSignUp() {
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

	return { error, t, handleContinueClick, onEmailChange };
}
