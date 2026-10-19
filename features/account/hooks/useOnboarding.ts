import { saveAccount } from "../services/accountService";
import { LanguageItem } from "@/constants/languages";
import { useApiError } from "@/hooks/useApiError";
import { useSessionUser } from "@/hooks/useSession";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { TextInputChangeEvent } from "react-native";

export function useOnboarding() {
	const { user } = useSessionUser();
	const router = useRouter();

	const [
		isSelectLanguageISpeakModalVisible,
		setSelectLanguageISpeakModalVisible,
	] = useState(false);
	const [
		isSelectLanguageToLearnModalVisible,
		setSelectLanguageToLearnModalVisible,
	] = useState(false);
	const [languageISpeak, setLanguageISpeak] =
		useState<LanguageItem["isoCode"]>("en");
	const [languageToLearn, setLanguageToLearn] =
		useState<LanguageItem["isoCode"]>("nl");

	const [name, setName] = useState("");
	const [error, setError] = useState<string>();

	const { t, i18n } = useTranslation();
	const { getErrorMessage } = useApiError();

	useEffect(() => {
		i18n.changeLanguage(languageISpeak);
	}, [languageISpeak, i18n]);

	const handleContinueClick = async () => {
		try {
			const response = await saveAccount(user, {
				id: user?.userId,
				name,
				language_speak: languageISpeak,
				language_learn: languageToLearn,
				email_verified: user?.email_verified ?? false,
				onboarded: true,
			});

			if (response.status === "error") {
				setError(
					getErrorMessage(response.error?.message) ??
						t("sign_up_error_generic"),
				);
				return;
			}

			router.replace("/authorized/learning");
		} catch (e) {
			setError(getErrorMessage((e as Error).message));
		}
	};

	const onNameChange = (e: TextInputChangeEvent) => {
		setName(e.nativeEvent.text);
	};

	return {
		isSelectLanguageISpeakModalVisible,
		setSelectLanguageISpeakModalVisible,
		isSelectLanguageToLearnModalVisible,
		setSelectLanguageToLearnModalVisible,
		languageISpeak,
		setLanguageISpeak,
		languageToLearn,
		setLanguageToLearn,
		error,
		t,
		handleContinueClick,
		onNameChange,
	};
}
