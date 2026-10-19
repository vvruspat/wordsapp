import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { resendVerificationEmail } from "@/api/auth";
import { saveAccount } from "../services/accountService";
import { LanguageItem } from "@/constants/languages";
import { useAuthContext } from "@/context/AuthContext";
import { useSessionUser } from "@/hooks/useSession";
import { useVocabularySync } from "@/hooks/useVocabularySync";

export function useProfile() {
	const { t, i18n } = useTranslation();
	const router = useRouter();
	const currentUser = useSessionUser();
	const user = currentUser?.user;
	const { logout } = useAuthContext();
	const { syncVocabulary } = useVocabularySync();

	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [languageISpeak, setLanguageISpeak] =
		useState<LanguageItem["isoCode"]>("en");
	const [languageToLearn, setLanguageToLearn] =
		useState<LanguageItem["isoCode"]>("nl");

	const [
		isSelectLanguageISpeakModalVisible,
		setSelectLanguageISpeakModalVisible,
	] = useState(false);
	const [
		isSelectLanguageToLearnModalVisible,
		setSelectLanguageToLearnModalVisible,
	] = useState(false);

	const [isSaving, setIsSaving] = useState(false);
	const [isLoggingOut, setIsLoggingOut] = useState(false);
	const [error, setError] = useState<string>();
	const [success, setSuccess] = useState(false);

	useEffect(() => {
		if (user) {
			setName(user.name);
			setEmail(user.email);
			setLanguageISpeak(user.language_speak as LanguageItem["isoCode"]);
			setLanguageToLearn(user.language_learn as LanguageItem["isoCode"]);
		}
	}, [user]);

	const handleSave = async () => {
		if (!user) return;

		setIsSaving(true);
		setError(undefined);
		setSuccess(false);

		const prevLanguageSpeak = user.language_speak;
		const prevLanguageLearn = user.language_learn;
		try {
			const response = await saveAccount(user, {
				id: user.userId,
				name,
				email,
				language_speak: languageISpeak,
				language_learn: languageToLearn,
				email_verified: user.email_verified ?? false,
				onboarded: user.onboarded ?? false,
			});

			if (response.status === "error") {
				setError(response.error?.message ?? t("profile_save_error"));
				return;
			}

			if (languageISpeak !== prevLanguageSpeak) {
				i18n.changeLanguage(languageISpeak);
			}

			if (
				languageToLearn !== prevLanguageLearn ||
				languageISpeak !== prevLanguageSpeak
			) {
				syncVocabulary(languageToLearn as LanguageItem["isoCode"]);
			}

			setSuccess(true);
		} catch (e) {
			setError((e as Error).message);
		} finally {
			setIsSaving(false);
		}
	};

	const handleVerifyEmail = async () => {
		if (!user?.email) return;

		setError(undefined);

		try {
			await resendVerificationEmail(user.email);

			router.push({
				pathname: "/verify",
				params: { email: user.email },
			});
		} catch (e) {
			setError((e as Error).message);
		}
	};

	const handleLogout = async () => {
		setIsLoggingOut(true);
		setError(undefined);
		setSuccess(false);

		try {
			await logout();
		} catch (e) {
			setError((e as Error).message);
			setIsLoggingOut(false);
		}
	};

	return {
		t,
		i18n,
		user,
		name,
		setName,
		email,
		setEmail,
		languageISpeak,
		setLanguageISpeak,
		languageToLearn,
		setLanguageToLearn,
		isSelectLanguageISpeakModalVisible,
		setSelectLanguageISpeakModalVisible,
		isSelectLanguageToLearnModalVisible,
		setSelectLanguageToLearnModalVisible,
		isSaving,
		isLoggingOut,
		error,
		success,
		handleSave,
		handleVerifyEmail,
		handleLogout,
	};
}
