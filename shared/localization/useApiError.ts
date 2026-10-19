import { useTranslation } from "react-i18next";

export const useApiError = () => {
	const { t } = useTranslation();

	const getErrorMessage = (error: string | undefined): string | undefined => {
		if (!error) return undefined;

		const normalized = error.toLowerCase();

		if (normalized.includes("user already exists")) {
			return t("error_user_already_exists");
		}
		if (normalized.includes("user not found")) {
			return t("error_user_not_found");
		}
		if (
			normalized.includes("invalid password") ||
			normalized.includes("invalid credentials") ||
			normalized.includes("wrong password")
		) {
			return t("error_invalid_credentials");
		}
		if (normalized.includes("unauthorized")) {
			return t("error_unauthorized");
		}

		return error;
	};

	return { getErrorMessage };
};
