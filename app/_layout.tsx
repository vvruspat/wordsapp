import { ScreenBackground } from "@/components/ScreenBackground";
import { BackgroundProvider } from "@/context/BackgroundContext";
import database from "@/db/database";
import { styles } from "@/general.styles";
import { WZStack } from "@/mob-ui";
import { Colors } from "@/mob-ui/brand/colors";
import { DatabaseProvider } from "@nozbe/watermelondb/DatabaseProvider";
import { useIsFocused } from "@react-navigation/native";
import { authenticateAsync } from "expo-local-authentication";
import { Stack, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import "../i18n";

export default function RootLayout() {
	const [isAuthenticated, setAuthenticated] = useState(false);
	const [isReady, setIsReady] = useState(false);
	const { t } = useTranslation();
	const router = useRouter();

	const isFocused = useIsFocused();

	useEffect(() => {
		if (!isFocused) {
			return;
		}

		(async () => {
			const access_token = await SecureStore.getItemAsync("access_token");

			if (!access_token) {
				setIsReady(true);
				return;
			}

			if (access_token) {
				await authenticateAsync({
					promptMessage: "Authenticate to access the app",
				}).then((result) => {
					if (!result.success) {
						setAuthenticated(false);
						setIsReady(true);
						return;
					}

					setAuthenticated(true);
					setIsReady(true);
				});
			}
		})();
	}, [isFocused]);

	useEffect(() => {
		if (isAuthenticated) {
			router.push("/authorized/learning");
		}
	}, [isAuthenticated, router]);

	if (!isReady) {
		return (
			<SafeAreaProvider>
				<SafeAreaView style={[styles.spinnerContainer]}>
					<ActivityIndicator size="large" color={Colors.primary.base} />
				</SafeAreaView>
			</SafeAreaProvider>
		);
	}

	return (
		<DatabaseProvider database={database}>
			<Stack
				screenLayout={({ children }) => (
					<BackgroundProvider>
						<WZStack>
							<StatusBar style="light" />
							<ScreenBackground />
							{children}
						</WZStack>
					</BackgroundProvider>
				)}
				screenOptions={{
					headerShown: false,
					contentStyle: styles.screen,
				}}
			>
				<Stack.Screen name="index" options={{ title: t("sign_up") }} />
				<Stack.Screen name="verify" options={{ title: "" }} />
				<Stack.Screen name="authorized" options={{ headerShown: false }} />
			</Stack>
		</DatabaseProvider>
	);
}
