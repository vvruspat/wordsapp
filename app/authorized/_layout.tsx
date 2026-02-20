import { SyncProgressBar } from "@/components/SyncProgressBar";
import { useSessionUser } from "@/hooks/useSession";
import { useVocabularyStore } from "@/hooks/useVocabularyStore";
import { useVocabularySync } from "@/hooks/useVocabularySync";
import { Colors } from "@/mob-ui/brand/colors";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import { Language } from "@vvruspat/words-types";
import Constants from "expo-constants";
import { Tabs } from "expo-router";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";

export default function RootLayout() {
	const { t } = useTranslation();

	const { syncVocabulary } = useVocabularySync();
	const { user } = useSessionUser();
	const { isSyncing } = useVocabularyStore();
	const hasSyncedRef = useRef(false);

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

	return (
		<View style={styles.container}>
			<SyncProgressBar />
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
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
});
