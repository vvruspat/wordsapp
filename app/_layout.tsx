import { DatabaseProvider } from "@nozbe/watermelondb/DatabaseProvider";
import { setAudioModeAsync } from "expo-audio";
import { File, Paths } from "expo-file-system";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, Platform } from "react-native";
import { SystemBars } from "react-native-edge-to-edge";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { DevPanel } from "@/components/DevPanel";
import { ScreenBackground } from "@/components/ScreenBackground";
import { AuthContext } from "@/context/AuthContext";
import { BackgroundProvider } from "@/context/BackgroundContext";
import database from "@/db/database";
import { styles } from "@/general.styles";
import { useExcerciseStore } from "@/hooks/useExcerciseStore";
import { useVocabularyStore } from "@/hooks/useVocabularyStore";
import { WZStack } from "@/mob-ui";
import { Colors } from "@/mob-ui/brand/colors";
import { clearAuthTokens, getAuthTokens } from "@/utils/authTokenStorage";
import "../i18n";
import * as Sentry from "@sentry/react-native";

Sentry.init({
	dsn: "https://a8b716bcc9e76aa60e8c6611605c48e5@o1062861.ingest.us.sentry.io/4510963666124800",

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
	const [isReady, setIsReady] = useState(false);
	const [hasStoredSession, setHasStoredSession] = useState(false);
	const { t } = useTranslation();
	const router = useRouter();
	const segments = useSegments();
	const rootSegment = segments[0];

	const prepareStoredSession = useCallback(async () => {
		// On iOS, Keychain (SecureStore) persists across app uninstalls.
		// Detect a fresh install by checking a flag in the documents directory
		// (which is cleared on uninstall) and wipe any stale tokens.
		const flag = new File(Paths.document, "has_launched");
		if (!flag.exists) {
			flag.write("1");
			await clearAuthTokens();
			setHasStoredSession(false);
			setIsReady(true);
			return;
		}

		const tokens = await getAuthTokens();
		setHasStoredSession(Boolean(tokens));
		setIsReady(true);
	}, []);

	useEffect(() => {
		prepareStoredSession();
	}, [prepareStoredSession]);

	const logout = useCallback(async () => {
		await clearAuthTokens();
		useExcerciseStore.getState().reset();
		useVocabularyStore.getState().reset();
		setHasStoredSession(false);
		router.replace("/");
	}, [router]);

	useEffect(() => {
		setAudioModeAsync({
			playsInSilentMode: true,
			shouldPlayInBackground: false,
			interruptionMode: "mixWithOthers",
		}).catch(() => {});
	}, []);

	useEffect(() => {
		if (!isReady || !hasStoredSession) {
			return;
		}

		if (rootSegment === "authorized" || rootSegment === "onboarding") {
			return;
		}

		router.replace("/authorized/learning");
	}, [hasStoredSession, isReady, rootSegment, router]);

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
		<AuthContext.Provider value={{ logout }}>
			<DatabaseProvider database={database}>
				<Stack
					screenLayout={({ children }) => (
						<BackgroundProvider>
							<WZStack>
								<StatusBar style="light" />
								{Platform.OS === "android" && (
									<SystemBars hidden={{ navigationBar: true }} />
								)}
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
					<Stack.Screen
						name="onboarding"
						options={{ title: "", headerShown: false }}
					/>
					<Stack.Screen name="authorized" options={{ headerShown: false }} />
				</Stack>
				<DevPanel />
			</DatabaseProvider>
		</AuthContext.Provider>
	);
});
