// Avoid importing BottomTabBar directly to prevent react-navigation context
// mismatches with expo-router's bundled navigation packages.

import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import { Language } from "@vvruspat/words-types";
import Constants from "expo-constants";
import { Tabs } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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

	// react-i18next v16 + React 19: useSyncExternalStore subscription can be
	// unreliable when subscribe deps are unstable. Manually subscribe so that
	// language changes always trigger a re-render of this layout and its children.
	const [, forceUpdate] = useState(0);
	useEffect(() => {
		const handler = () => forceUpdate((c) => c + 1);
		i18n.on("languageChanged", handler);
		return () => i18n.off("languageChanged", handler);
	}, []);

	const { syncVocabulary } = useVocabularySync();
	const { user } = useSessionUser();
	const { isSyncing } = useVocabularyStore();
	const { setCurrentCatalogs, setCurrentTopics, setHasHydrated, _hasHydrated } =
		useExcerciseStore();
	const hasSyncedRef = useRef(false);

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
				setCurrentTopics(JSON.parse(savedTopics));
			}

			setHasHydrated(true);
		})();
	}, [
		user?.userId,
		_hasHydrated,
		setCurrentCatalogs,
		setCurrentTopics,
		setHasHydrated,
	]);

	useEffect(() => {
		if (!user) {
			hasSyncedRef.current = false;
			return;
		}

		const server = Constants.expoConfig?.extra?.API_SERVER as
			| string
			| undefined;
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 2500);

		const checkOnlineAndSync = async () => {
			if (isSyncing || hasSyncedRef.current) {
				return;
			}

			if (!server) {
				hasSyncedRef.current = true;
				syncVocabulary(user.language_learn as Language);
				return;
			}

			try {
				const res = await fetch(server, {
					method: "GET",
					signal: controller.signal,
				});
				if (res) {
					hasSyncedRef.current = true;
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

	const insets = useSafeAreaInsets();

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
			<View
				pointerEvents="none"
				style={{
					position: "absolute",
					bottom: 49 + insets.bottom,
					left: 0,
					right: 0,
				}}
			>
				<SyncProgressBar />
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
});
