import User from "@/models/User";
import { $fetch } from "@/utils/fetch";
import { setUILanguage } from "@/utils/setUILanguage";
import { Q } from "@nozbe/watermelondb";
import { useDatabase } from "@nozbe/watermelondb/hooks";
import { components, Language } from "@repo/types";
import { authenticateAsync } from "expo-local-authentication";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { jwtDecode } from "jwt-decode";
import { useEffect, useState } from "react";

export const useSessionUser = () => {
	const database = useDatabase();
	const router = useRouter();

	const [user, setUser] = useState<User | null>(null);

	const [refreshToken, setRefreshToken] = useState<string | null>(null);
	const [accessToken, setAccessToken] = useState<string | null>(null);

	const authUser = async (
		accessToken: string,
		refreshToken: string,
		incomeUserData: components["schemas"]["UserDto"],
	) => {
		// move to separate function to reuse
		await SecureStore.setItemAsync("access_token", accessToken);
		await SecureStore.setItemAsync("refresh_token", refreshToken);

		await database.write(async () => {
			const usersCollection = database.get<User>("users");
			const usersData = await usersCollection
				.query(Q.where("user_id", incomeUserData.id))
				.fetch();

			if (usersData[0]) {
				const userData = await usersCollection.find(usersData[0].id);
				await userData.update((u) => {
					u.name = incomeUserData.name;
					u.email = incomeUserData.email;
					if (incomeUserData.language_speak) {
						u.language_speak = incomeUserData.language_speak;
					}
					if (incomeUserData.language_learn) {
						u.language_learn = incomeUserData.language_learn;
					}
					if (incomeUserData.email_verified) {
						u.email_verified = incomeUserData.email_verified;
					}
					if (incomeUserData.created_at) {
						u.remoteCreatedAt = incomeUserData.created_at;
					}
				});
			} else {
				await usersCollection.create((u) => {
					u.userId = incomeUserData.id;
					u.name = incomeUserData.name;
					u.email = incomeUserData.email;
					u.language_speak = incomeUserData.language_speak ?? "en";

					if (incomeUserData.language_learn) {
						u.language_learn = incomeUserData.language_learn;
					}
					if (incomeUserData.email_verified) {
						u.email_verified = incomeUserData.email_verified;
					}
					if (incomeUserData.created_at) {
						u.remoteCreatedAt = incomeUserData.created_at;
					}
				});
			}
		});

		// Update state after user is created/updated in database
		// This will trigger the useEffect to observe the user
		setAccessToken(accessToken);
		setRefreshToken(refreshToken);

		const result = await authenticateAsync({
			promptMessage: "Authenticate to access the app",
		});

		if (!result.success) {
			router.push("/");
		} else {
			router.push("/authorized/learning");
		}
	};

	useEffect(() => {
		if (!accessToken) {
			setUser(null);
			return;
		}

		try {
			const decoded = jwtDecode<{ sub: number }>(accessToken);
			const userId = decoded.sub;

			const usersCollection = database.get<User>("users");
			const subscription = usersCollection
				.query(Q.where("user_id", userId))
				.observe()
				.subscribe((users) => {
					setUser(users[0] || null);
				});

			return () => subscription.unsubscribe();
		} catch (error) {
			console.error("Failed to decode token or query user:", error);
			setUser(null);
		}
	}, [database, accessToken]);

	useEffect(() => {
		const fetchTokens = async () => {
			const refresh = await SecureStore.getItemAsync("refresh_token");
			const access = await SecureStore.getItemAsync("access_token");

			if (access && refresh) {
				const decoded = jwtDecode<{ exp: number }>(access);
				const expiresIn = decoded.exp;

				const expiresInMs = expiresIn * 1000;
				const sevenDaysInMs = 1000 * 60 * 60 * 24 * 7;
				const isExpiringSoon = expiresInMs < Date.now() + sevenDaysInMs;

				if (isExpiringSoon) {
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

	useEffect(() => {
		if (user) {
			console.log("setUILanguage", user.language_speak);
			setUILanguage(user.language_speak as Language);
		}
	}, [user]);

	return {
		refreshToken,
		accessToken,
		authUser,
		user,
	};
};
