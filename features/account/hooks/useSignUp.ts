import { useAccountOperation } from "./useAccountOperation";
import { requestTmpPassword } from "@/api/auth";
import { useApiError } from "@/shared/localization/useApiError";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { TextInputChangeEvent } from "react-native";

export function useSignUp() {
	const beginOperation = useAccountOperation();
	const router = useRouter();

	const [email, setEmail] = useState("");
	const [error, setError] = useState<string>();

	const { t } = useTranslation();
	const { getErrorMessage } = useApiError();

	const handleContinueClick = async () => {
		const operation = beginOperation("handleContinueClick");
		if (!operation) return;
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
			operation.finish();
		}
	};

	const onEmailChange = (e: TextInputChangeEvent) => {
		setEmail(e.nativeEvent.text);
	};

	return { error, t, handleContinueClick, onEmailChange };
}
