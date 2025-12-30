import { ScreenBackground } from "@/components/ScreenBackground";
import { BackgroundProvider } from "@/context/BackgroundContext";
import { styles } from "@/general.styles";
import { WZStack } from "@/mob-ui";
import { Colors } from "@/mob-ui/brand/colors";
import Category from "@/models/Category";
import LearningProgress from "@/models/LearningProgress";
import migrations from "@/models/migrations";
import { schema } from "@/models/schema";
import Topic from "@/models/Topic";
import Translation from "@/models/Translation";
import User from "@/models/User";
import UserSetting from "@/models/UserSetting";
import VocabCatalog from "@/models/VocabCatalog";
import Word from "@/models/Word";
import WordTranslation from "@/models/WordTranslation";
import { Database } from "@nozbe/watermelondb";
import SQLiteAdapter from "@nozbe/watermelondb/adapters/sqlite";
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

// Component that handles vocabulary sync - must be inside DatabaseProvider
const adapter = new SQLiteAdapter({
	schema,
	migrations,
	jsi: false,
	dbName: "wordsapp",
	// (optional, but you should implement this method)
	onSetUpError: (_error) => {
		// Database failed to load -- offer the user to reload the app or log out
	},
});

// Then, make a Watermelon database from it!
const database = new Database({
	adapter,
	modelClasses: [
		User,
		UserSetting,
		Word,
		Translation,
		WordTranslation,
		VocabCatalog,
		Topic,
		LearningProgress,
		Category,
	],
});

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
