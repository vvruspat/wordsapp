import User from "@/models/User";
import { $fetch } from "@/utils/fetch";
import { useDatabase } from "@nozbe/watermelondb/hooks";
import * as SecureStore from "expo-secure-store";
import { jwtDecode } from "jwt-decode";
import { useEffect, useState } from "react";

export const useSessionUser = () => {
	const database = useDatabase();
	const [user, setUser] = useState<User[] | null>(null);

	const [refreshToken, setRefreshToken] = useState<string | null>(null);
	const [accessToken, setAccessToken] = useState<string | null>(null);

	useEffect(() => {
		const progressCollection = database.get<User>("users");

		const subscription = progressCollection
			.query()
			.observe()
			.subscribe(setUser);

		return () => subscription.unsubscribe();
	}, [database]);

	useEffect(() => {
		const fetchTokens = async () => {
			const refresh = await SecureStore.getItemAsync("refresh_token");
			const access = await SecureStore.getItemAsync("access_token");

			if (access && refresh) {
				const { expiresIn } = jwtDecode<{ expiresIn: number }>(access);

				if (expiresIn * 1000 < Date.now() - 1000 * 60 * 60 * 24 * 7) {
					// token will expire in less than 7 days
					setAccessToken(null);
					setRefreshToken(null);
					await SecureStore.deleteItemAsync("access_token");
					await SecureStore.deleteItemAsync("refresh_token");

					const response = await $fetch("/auth/refresh-token", "post", {
						body: { refresh_token: refresh },
					});

					const newAccessToken = response?.data?.access_token;
					const newRefreshToken = response?.data?.refresh_token;

					if (newAccessToken && newRefreshToken) {
						await SecureStore.setItemAsync("access_token", newAccessToken);
						await SecureStore.setItemAsync("refresh_token", newRefreshToken);
						setAccessToken(newAccessToken);
						setRefreshToken(newRefreshToken);
					} else {
						setAccessToken(null);
						setRefreshToken(null);
						await SecureStore.deleteItemAsync("access_token");
						await SecureStore.deleteItemAsync("refresh_token");
					}
					return;
				} else {
					// token is valid
					setAccessToken(access);
					setRefreshToken(refresh);
					return;
				}
			}
		};

		fetchTokens();
	}, []);

	return {
		refreshToken,
		accessToken,
		user: user ? user[0] : null,
	};
};
