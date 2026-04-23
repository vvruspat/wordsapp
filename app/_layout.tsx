import { DatabaseProvider } from "@nozbe/watermelondb/DatabaseProvider";
import { useIsFocused } from "@react-navigation/native";
import { setAudioModeAsync } from "expo-audio";
import { File, Paths } from "expo-file-system";
import { authenticateAsync, isEnrolledAsync } from "expo-local-authentication";
import { Stack, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { StatusBar } from "expo-status-bar";
import { Platform } from "react-native";
import { SystemBars } from "react-native-edge-to-edge";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { DevPanel } from "@/components/DevPanel";
import { ScreenBackground } from "@/components/ScreenBackground";
import { AuthContext, resetBiometricsPreference } from "@/context/AuthContext";
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

export default Sentry.wrap(function RootLayout() {
	const [isAuthenticated, setAuthenticated] = useState(false);
	const [isReady, setIsReady] = useState(false);
	const { t } = useTranslation();
	const router = useRouter();
	const startupAuthDone = useRef(false);

	const isFocused = useIsFocused();

	const triggerBiometricAuth = useCallback(async (): Promise<boolean> => {
		// On iOS, Keychain (SecureStore) persists across app uninstalls.
		// Detect a fresh install by checking a flag in the documents directory
		// (which is cleared on uninstall) and wipe any stale tokens.
		const flag = new File(Paths.document, "has_launched");
		if (!flag.exists) {
			flag.write("1");
			await SecureStore.deleteItemAsync("access_token");
			await SecureStore.deleteItemAsync("refresh_token");
			setIsReady(true);
			return true;
		}

		const access_token = await SecureStore.getItemAsync("access_token");

		if (!access_token) {
			setIsReady(true);
			return true;
		}

		const enrolled = await isEnrolledAsync();

		// User previously opted out of biometrics — authenticate via tokens only.
		const biometricsSkipped = await SecureStore.getItemAsync("biometrics_skipped");

		if (!enrolled || biometricsSkipped === "true") {
			setAuthenticated(true);
			setIsReady(true);
			return true;
		}

		const result = await authenticateAsync({
			promptMessage: "Authenticate to access the app",
		});

		if (!result.success) {
			// User explicitly dismissed/cancelled — fall back to token-based auth
			// and remember the preference so we don't prompt again next session.
			const isUserCancellation =
				result.error === "user_cancel" ||
				result.error === "system_cancel" ||
				result.error === "user_fallback";

			if (isUserCancellation) {
				await SecureStore.setItemAsync("biometrics_skipped", "true");
				setAuthenticated(true);
				setIsReady(true);
				return true;
			}

			setAuthenticated(false);
			setIsReady(true);
			return false;
		}

		setAuthenticated(true);
		setIsReady(true);
		return true;
	}, []);

	useEffect(() => {
		if (!isFocused || startupAuthDone.current) {
			return;
		}

		startupAuthDone.current = true;
		triggerBiometricAuth();
	}, [isFocused, triggerBiometricAuth]);

	useEffect(() => {
		setAudioModeAsync({
			playsInSilentMode: true,
			shouldPlayInBackground: false,
			interruptionMode: "mixWithOthers",
		}).catch(() => {});
	}, []);

	useEffect(() => {
		if (isAuthenticated) {
			router.replace("/authorized/learning");
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
		<AuthContext.Provider value={{ triggerBiometricAuth, resetBiometricsPreference }}>
		<DatabaseProvider database={database}>
			<Stack
				screenLayout={({ children }) => (
					<BackgroundProvider>
						<WZStack>
							<StatusBar style="light" />
							{Platform.OS === "android" && <SystemBars hidden={{ navigationBar: true }} />}
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
				<Stack.Screen name="onboarding" options={{ title: "", headerShown: false }} />
				<Stack.Screen name="authorized" options={{ headerShown: false }} />
			</Stack>
			<DevPanel />
		</DatabaseProvider>
		</AuthContext.Provider>
	);
});
