import { DatabaseProvider } from "@nozbe/watermelondb/DatabaseProvider";
import { useIsFocused } from "@react-navigation/native";
import * as FileSystem from "expo-file-system/legacy";
import { authenticateAsync } from "expo-local-authentication";
import { Stack, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, AppState } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { DevPanel } from "@/components/DevPanel";
import { ScreenBackground } from "@/components/ScreenBackground";
import { BackgroundProvider } from "@/context/BackgroundContext";
import database from "@/db/database";
import { styles } from "@/general.styles";
import { WZStack } from "@/mob-ui";
import { Colors } from "@/mob-ui/brand/colors";
import "../i18n";
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'https://a8b716bcc9e76aa60e8c6611605c48e5@o1062861.ingest.us.sentry.io/4510963666124800',

  // Adds more context data to events (IP address, cookies, user, etc.)
  // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
  sendDefaultPii: true,

  // Enable Logs
  enableLogs: true,

  // Configure Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1,
  integrations: [Sentry.mobileReplayIntegration()],

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: __DEV__,
});

const BACKGROUND_TIMEOUT_MS = 60 * 1000; // 60 seconds

export default Sentry.wrap(function RootLayout() {
	const [isAuthenticated, setAuthenticated] = useState(false);
	const [isReady, setIsReady] = useState(false);
	const { t } = useTranslation();
	const router = useRouter();
	const backgroundedAt = useRef<number | null>(null);

	const isFocused = useIsFocused();

	const triggerBiometricAuth = useCallback(async () => {
		// On iOS, Keychain (SecureStore) persists across app uninstalls.
		// Detect a fresh install by checking a flag in the documents directory
		// (which is cleared on uninstall) and wipe any stale tokens.
		const flagPath = `${FileSystem.documentDirectory}has_launched`;
		const flag = await FileSystem.getInfoAsync(flagPath);
		if (!flag.exists) {
			await FileSystem.writeAsStringAsync(flagPath, "1");
			await SecureStore.deleteItemAsync("access_token");
			await SecureStore.deleteItemAsync("refresh_token");
			setIsReady(true);
			return;
		}

		const access_token = await SecureStore.getItemAsync("access_token");

		if (!access_token) {
			setIsReady(true);
			return;
		}

		const result = await authenticateAsync({
			promptMessage: "Authenticate to access the app",
		});

		if (!result.success) {
			setAuthenticated(false);
			setIsReady(true);
			return;
		}

		setAuthenticated(true);
		setIsReady(true);
	}, []);

	useEffect(() => {
		if (!isFocused) {
			return;
		}

		triggerBiometricAuth();
	}, [isFocused, triggerBiometricAuth]);

	useEffect(() => {
		const subscription = AppState.addEventListener("change", async (nextState) => {
			if (nextState === "background" || nextState === "inactive") {
				backgroundedAt.current = Date.now();
			} else if (nextState === "active" && backgroundedAt.current !== null) {
				const elapsed = Date.now() - backgroundedAt.current;
				backgroundedAt.current = null;

				if (elapsed >= BACKGROUND_TIMEOUT_MS && isAuthenticated) {
					const result = await authenticateAsync({
						promptMessage: "Authenticate to access the app",
					});

					if (!result.success) {
						setAuthenticated(false);
					}
				}
			}
		});

		return () => subscription.remove();
	}, [isAuthenticated]);

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
			<DevPanel />
		</DatabaseProvider>
	);
});