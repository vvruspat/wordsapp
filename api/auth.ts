import { $fetch } from "@/utils/fetch";

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

export const resendVerificationEmail = () =>
	$fetch("/auth/verify-email/resend", "post", {});

export const refreshToken = (refresh_token: string) =>
	$fetch("/auth/refresh-token", "post", { body: { refresh_token } });
