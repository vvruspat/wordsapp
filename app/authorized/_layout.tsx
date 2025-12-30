import { useSessionUser } from "@/hooks/useSession";
import { useVocabularySync } from "@/hooks/useVocabularySync";
import { Colors } from "@/mob-ui/brand/colors";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import { Language } from "@repo/types";
import { Tabs } from "expo-router";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

export default function RootLayout() {
	const { t } = useTranslation();

	const { syncVocabulary } = useVocabularySync();
	const { user } = useSessionUser();

	useEffect(() => {
		if (user) {
			syncVocabulary(user.language_learn as Language);
		}
	}, [syncVocabulary, user]);

	return (
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
	);
}
