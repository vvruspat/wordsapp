import { useAuthorizedLifecycle } from "./useAuthorizedLifecycle";
// Avoid importing BottomTabBar directly to prevent react-navigation context
// mismatches with expo-router's bundled navigation packages.

import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import { Tabs, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BackgroundProgressBar } from "@/components/BackgroundProgressBar";
import { SyncProgressBar } from "@/components/SyncProgressBar";
import i18n from "@/i18n";
import { Colors } from "@/mob-ui/brand/colors";

export default function RootLayout() {
	const { t } = useTranslation();
	const dialoguesEnabled =
		process.env.EXPO_PUBLIC_DIALOGUES_ENABLED !== "false";
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

	useAuthorizedLifecycle();

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
					name="dialogues"
					options={{
						title: t("dialogue_tab"),
						href: dialoguesEnabled ? undefined : null,
						headerShown: false,
						tabBarHideOnKeyboard: true,
						tabBarIcon: ({ color }) => (
							<FontAwesome5 name="comments" size={24} color={color} />
						),
					}}
					listeners={{
						tabPress: () => router.navigate("/authorized/dialogues"),
					}}
				/>
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
			<BackgroundProgressBar bottomOffset={49 + tabBarBottomInset} />
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
