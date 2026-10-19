import { useAccountOperation } from "./useAccountOperation";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { resendVerificationEmail } from "@/api/auth";
import { saveAccount } from "../services/accountService";
import { LanguageItem } from "@/constants/languages";
import { useAuthContext } from "@/context/AuthContext";
import { useSessionUser } from "@/shared/session/useSession";

export function useProfile() {
	const beginOperation = useAccountOperation();
	const { t, i18n } = useTranslation();
	const router = useRouter();
	const currentUser = useSessionUser();
	const user = currentUser?.user;
	const { logout } = useAuthContext();

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
		const operation = beginOperation("handleSave");
		if (!operation) return;
		try {
			if (!user) return;

			setIsSaving(true);
			setError(undefined);
			setSuccess(false);

			const prevLanguageSpeak = user.language_speak;
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
				if (!operation.current()) return;

				if (response.status === "error") {
					setError(response.error?.message ?? t("profile_save_error"));
					return;
				}

				if (languageISpeak !== prevLanguageSpeak) {
					i18n.changeLanguage(languageISpeak);
				}

				setSuccess(true);
			} catch (e) {
				if (!operation.current()) return;
				setError((e as Error).message);
			} finally {
				setIsSaving(false);
			}
		} catch (error) {
			if (operation.current())
				setError(error instanceof Error ? error.message : String(error));
		} finally {
			operation.finish();
		}
	};

	const handleVerifyEmail = async () => {
		const operation = beginOperation("handleVerifyEmail");
		if (!operation) return;
		try {
			if (!user?.email) return;

			setError(undefined);

			try {
				await resendVerificationEmail(user.email);
				if (!operation.current()) return;

				router.push({
					pathname: "/verify",
					params: { email: user.email },
				});
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

	const handleLogout = async () => {
		const operation = beginOperation("handleLogout");
		if (!operation) return;
		try {
			setIsLoggingOut(true);
			setError(undefined);
			setSuccess(false);

			try {
				await logout();
				if (!operation.current()) return;
			} catch (e) {
				if (!operation.current()) return;
				setError((e as Error).message);
				setIsLoggingOut(false);
			}
		} catch (error) {
			if (operation.current())
				setError(error instanceof Error ? error.message : String(error));
		} finally {
			operation.finish();
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
