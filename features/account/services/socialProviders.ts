import { Platform } from "react-native";
import type { SocialChallenge } from "@/api/socialAuthContract";
import type { SocialProvider } from "@/shared/session/socialAuth";

export function isGoogleConfigured() {
	return Boolean(
		(Platform.OS === "ios" || Platform.OS === "android") &&
			process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID &&
			(Platform.OS !== "ios" || process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID),
	);
}

export async function requestProviderCredential(
	provider: SocialProvider,
	challenge: SocialChallenge,
): Promise<{ id_token: string; name?: string } | null> {
	if (provider === "apple") {
		const apple = await import("expo-apple-authentication");
		try {
			const credential = await apple.signInAsync({
				requestedScopes: [
					apple.AppleAuthenticationScope.FULL_NAME,
					apple.AppleAuthenticationScope.EMAIL,
				],
				nonce: challenge.nonce,
				state: challenge.challenge_id,
			});
			if (
				!credential.identityToken ||
				credential.state !== challenge.challenge_id
			)
				throw new Error("Invalid Apple credential");
			const name = [
				credential.fullName?.givenName,
				credential.fullName?.familyName,
			]
				.filter(Boolean)
				.join(" ");
			return { id_token: credential.identityToken, ...(name ? { name } : {}) };
		} catch (error) {
			if (hasCode(error, "ERR_REQUEST_CANCELED")) return null;
			throw error;
		}
	}

	if (!isGoogleConfigured())
		throw new Error("Google sign-in is not configured");
	const { GoogleOneTapSignIn, isSuccessResponse, isCancelledResponse } =
		await import("react-native-nitro-google-signin");
	GoogleOneTapSignIn.configure({
		webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "",
		iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
		nonce: challenge.nonce,
		offlineAccess: false,
	});
	try {
		if (Platform.OS === "android") await GoogleOneTapSignIn.checkPlayServices();
		// Always request fresh credentials with this challenge's nonce and an account picker.
		const response = await GoogleOneTapSignIn.presentExplicitSignIn();
		if (isCancelledResponse(response)) return null;
		if (!isSuccessResponse(response) || !response.data.idToken)
			throw new Error("Missing Google credential");
		return { id_token: response.data.idToken };
	} catch (error) {
		if (hasCode(error, "SIGN_IN_CANCELLED")) return null;
		throw error;
	}
}

function hasCode(error: unknown, code: string) {
	return (
		typeof error === "object" &&
		error !== null &&
		"code" in error &&
		error.code === code
	);
}
