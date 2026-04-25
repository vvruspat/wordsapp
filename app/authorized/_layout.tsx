// Avoid importing BottomTabBar directly to prevent react-navigation context
// mismatches with expo-router's bundled navigation packages.

import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import { Language } from "@vvruspat/words-types";
import Constants from "expo-constants";
import { Tabs, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AudioDownloadProgressBar } from "@/components/AudioDownloadProgressBar";
import { SyncProgressBar } from "@/components/SyncProgressBar";
import { userSettingsRepository } from "@/db/repositories/userSettings.repository";
import { useExcerciseStore } from "@/hooks/useExcerciseStore";
import { useSessionUser } from "@/hooks/useSession";
import { useVocabularyStore } from "@/hooks/useVocabularyStore";
import { useVocabularySync } from "@/hooks/useVocabularySync";
import i18n from "@/i18n";
import { Colors } from "@/mob-ui/brand/colors";

export default function RootLayout() {
	const { t } = useTranslation();
	const router = useRouter();

	// react-i18next v16 + React 19: useSyncExternalStore subscription can be
	// unreliable when subscribe deps are unstable. Manually subscribe so that
	// language changes always trigger a re-render of this layout and its children.
	const [, forceUpdate] = useState(0);
	useEffect(() => {
		const handler = () => forceUpdate((c) => c + 1);
		i18n.on("languageChanged", handler);
		return () => i18n.off("languageChanged", handler);
	}, []);

	const { syncVocabulary, downloadMissingAudio } = useVocabularySync();
	const { user } = useSessionUser();

	useEffect(() => {
		if (user && !user.onboarded && !user.name) {
			router.replace("/onboarding");
		}
	}, [user, router]);
	const { isSyncing, isAudioDownloading } = useVocabularyStore();
	const {
		setCurrentCatalogs,
		setCurrentTopics,
		setHasHydrated,
		setTopicsInitialized,
		_hasHydrated,
	} = useExcerciseStore();
	const lastSyncedLanguageRef = useRef<string | null>(null);
	const lastLanguageLearnRef = useRef<string | null>(null);

	// Reset catalog/topic selection when the learning language changes
	useEffect(() => {
		if (!user?.userId || !user.language_learn) return;

		const prevLanguage = lastLanguageLearnRef.current;
		lastLanguageLearnRef.current = user.language_learn;

		if (prevLanguage !== null && prevLanguage !== user.language_learn) {
			const userId = user.userId.toString();
			setCurrentCatalogs([]);
			setCurrentTopics([]);
			setTopicsInitialized(false);
			setHasHydrated(false);
			Promise.all([
				userSettingsRepository.set(
					userId,
					"selected_catalogs",
					JSON.stringify([]),
				),
				userSettingsRepository.set(
					userId,
					"selected_topics",
					JSON.stringify([]),
				),
			]).catch(() => {});
		}
	}, [
		user?.userId,
		user?.language_learn,
		setCurrentCatalogs,
		setCurrentTopics,
		setTopicsInitialized,
		setHasHydrated,
	]);

	useEffect(() => {
		if (!user?.userId || _hasHydrated) return;

		const userId = user.userId.toString();

		(async () => {
			const [savedCatalogs, savedTopics] = await Promise.all([
				userSettingsRepository.get(userId, "selected_catalogs"),
				userSettingsRepository.get(userId, "selected_topics"),
			]);

			if (savedCatalogs) {
				setCurrentCatalogs(JSON.parse(savedCatalogs));
			}
			if (savedTopics) {
				const parsedTopics = JSON.parse(savedTopics);
				setCurrentTopics(parsedTopics);
				setTopicsInitialized(
					Array.isArray(parsedTopics) && parsedTopics.length > 0,
				);
			}

			setHasHydrated(true);
		})();
	}, [
		user?.userId,
		_hasHydrated,
		setCurrentCatalogs,
		setCurrentTopics,
		setHasHydrated,
		setTopicsInitialized,
	]);

	useEffect(() => {
		if (!user || !user.email_verified) {
			lastSyncedLanguageRef.current = null;
			return;
		}

		const server = Constants.expoConfig?.extra?.API_SERVER as
			| string
			| undefined;
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 2500);

		const checkOnlineAndSync = async () => {
			if (isSyncing || lastSyncedLanguageRef.current === user.language_learn) {
				return;
			}

			if (!server) {
				lastSyncedLanguageRef.current = user.language_learn;
				syncVocabulary(user.language_learn as Language);
				return;
			}

			try {
				const res = await fetch(server, {
					method: "GET",
					signal: controller.signal,
				});
				if (res) {
					lastSyncedLanguageRef.current = user.language_learn;
					syncVocabulary(user.language_learn as Language);
				}
			} catch {
				// Offline or server unreachable: skip sync for this run.
			} finally {
				clearTimeout(timeoutId);
			}
		};

		checkOnlineAndSync();

		return () => {
			clearTimeout(timeoutId);
			controller.abort();
		};
	}, [syncVocabulary, user, isSyncing]);

	useEffect(() => {
		if (
			!user?.email_verified ||
			!user.language_learn ||
			isSyncing ||
			isAudioDownloading ||
			lastSyncedLanguageRef.current !== user.language_learn
		) {
			return;
		}

		void downloadMissingAudio(user.language_learn as Language);
	}, [
		downloadMissingAudio,
		isAudioDownloading,
		isSyncing,
		user?.email_verified,
		user?.language_learn,
	]);

	const insets = useSafeAreaInsets();
	const androidBottomInset = Platform.OS === "android" ? 12 : 0;
	const extraTabBarPaddingBottom = Platform.OS === "android" ? 8 : 0;
	const tabBarBottomInset =
		Math.max(insets.bottom, androidBottomInset) + extraTabBarPaddingBottom;

	return (
		<View style={styles.container}>
			<Tabs
				screenOptions={{
					tabBarItemStyle: { paddingTop: 8 },
					tabBarActiveTintColor: Colors.primary.base,
					tabBarInactiveTintColor: Colors.greys.grey8,
					tabBarStyle: {
						backgroundColor: Colors.backgrounds.primaryBackground,
						borderTopColor: Colors.greys.whiteAlpha60,
						paddingBottom: tabBarBottomInset,
						height: 49 + tabBarBottomInset,
					},
					sceneStyle: { backgroundColor: "transparent" },
				}}
			>
				<Tabs.Screen
					name="learning"
					options={{
						title: t("dashboard_learning"),
						headerShown: false,
						tabBarIcon: ({ color }) => (
							<FontAwesome5 name="chalkboard-teacher" size={24} color={color} />
						),
					}}
					listeners={{
						tabPress: () => {
							router.navigate("/authorized/learning");
						},
					}}
				/>
				<Tabs.Screen
					name="catalog"
					options={{
						title: t("dashboard_vocabulary"),
						headerShown: false,
						tabBarIcon: ({ color }) => (
							<FontAwesome5 name="book" size={24} color={color} />
						),
					}}
				/>
				<Tabs.Screen
					name="profile"
					options={{
						title: t("dashboard_profile"),
						headerShown: false,
						tabBarIcon: ({ color }) => (
							<FontAwesome5 name="user" size={24} color={color} />
						),
					}}
				/>
			</Tabs>
			<AudioDownloadProgressBar bottomOffset={49 + tabBarBottomInset} />
			<SyncProgressBar />
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		position: "relative",
	},
});
