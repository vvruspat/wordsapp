import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import { Tabs } from "expo-router";
import { useTranslation } from "react-i18next";
import { Colors } from "@/mob-ui/brand/colors";

export default function RootLayout() {
	const { t } = useTranslation();

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
				name="settings"
				options={{
					title: t("dashboard_settings"),
					headerShown: false,
					tabBarIcon: ({ color }) => (
						<FontAwesome5 name="cog" size={24} color={color} />
					),
				}}
			/>
		</Tabs>
	);
}
