import { $fetch } from "@/utils/fetch";
import type { SocialSignInRequest } from "./socialAuthContract";
import type { SocialProvider } from "@/shared/session/socialAuth";

export const requestSocialChallenge = (provider: SocialProvider) =>
	$fetch("/auth/social/challenge", "post", {
		body: { provider },
		noAuth: true,
	});

export const signInSocial = (body: SocialSignInRequest) =>
	$fetch("/auth/social/signin", "post", { body, noAuth: true });

export const signUp = (body: {
	name: string;
	email: string;
	language_speak: string;
	language_learn: string;
}) => $fetch("/auth/signup", "post", { body });

export const signIn = (body: { email: string; password: string }) =>
	$fetch("/auth/signin", "post", { body });

export const requestTmpPassword = (email: string) =>
	$fetch("/auth/tmp-password", "post", { body: { email } } as object);

export const verifyEmail = (body: { code: string; email: string }) =>
	$fetch("/auth/verify-email", "post", { body });

export const resendVerificationEmail = (email: string) =>
	$fetch("/auth/verify-email/resend", "post", { body: { email } });

export const refreshToken = (refresh_token: string) =>
	$fetch("/auth/refresh-token", "post", { body: { refresh_token } });
