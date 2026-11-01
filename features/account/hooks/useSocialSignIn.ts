import { useState } from "react";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { requestSocialChallenge, signInSocial } from "@/api/auth";
import type { SocialProvider } from "@/shared/session/socialAuth";
import { useSessionUser } from "@/shared/session/useSession";
import { useAccountOperation } from "./useAccountOperation";
import { requestProviderCredential } from "../services/socialProviders";

export function useSocialSignIn(
	beginOperation: ReturnType<typeof useAccountOperation>,
) {
	const { authUser } = useSessionUser();
	const router = useRouter();
	const { t } = useTranslation();
	const [pendingProvider, setPendingProvider] = useState<SocialProvider | null>(
		null,
	);
	const [error, setError] = useState<string>();

	const signIn = async (provider: SocialProvider) => {
		const operation = beginOperation("authentication");
		if (!operation) return;
		setError(undefined);
		setPendingProvider(provider);
		try {
			const challenge = await requestSocialChallenge(provider);
			if (!operation.current()) return;
			if (challenge.status === "error" || !challenge.data)
				throw new Error("Unable to start social sign-in");
			const credential = await requestProviderCredential(
				provider,
				challenge.data,
			);
			if (!operation.current() || !credential) return;
			const response = await signInSocial({
				provider,
				challenge_id: challenge.data.challenge_id,
				...credential,
			});
			if (!operation.current()) return;
			if (response.status === "error") {
				setError(
					t(
						response.error?.status === 409
							? "social_sign_in_use_email"
							: "social_sign_in_error",
					),
				);
				return;
			}
			const data = response.data;
			if (!data?.access_token || !data.refresh_token || !data.user)
				throw new Error("Incomplete social sign-in response");
			const authenticated = await authUser(
				data.access_token,
				data.refresh_token,
				data.user,
			);
			if (!authenticated || !operation.mounted()) return;
			router.replace(
				data.user.onboarded ? "/authorized/learning" : "/onboarding",
			);
		} catch {
			if (operation.current()) setError(t("social_sign_in_error"));
		} finally {
			if (operation.mounted()) setPendingProvider(null);
			operation.finish();
		}
	};

	return {
		signIn,
		error,
		pendingProvider,
		clearError: () => setError(undefined),
	};
}
