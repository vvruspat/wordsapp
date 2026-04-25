import * as SecureStore from "expo-secure-store";

const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";

export type AuthTokens = {
	accessToken: string;
	refreshToken: string;
};

export const getAccessToken = () => SecureStore.getItemAsync(ACCESS_TOKEN_KEY);

export const getAuthTokens = async (): Promise<AuthTokens | null> => {
	const [accessToken, refreshToken] = await Promise.all([
		SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
		SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
	]);

	if (!accessToken || !refreshToken) {
		return null;
	}

	return { accessToken, refreshToken };
};

export const setAuthTokens = (accessToken: string, refreshToken: string) =>
	Promise.all([
		SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken),
		SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken),
	]);

export const clearAuthTokens = () =>
	Promise.all([
		SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
		SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
	]);
