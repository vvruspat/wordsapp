import "dotenv/config";

export default ({ config }) => {
	return {
		...config,
		expo: {
			name: "WordsApp",
			slug: "wordsapp",
			version: "1.0.0",
			orientation: "portrait",
			icon: "./assets/images/icon.png",
			scheme: "mobile",
			userInterfaceStyle: "automatic",
			newArchEnabled: true,
			ios: {
				supportsTablet: true,
				bundleIdentifier: "digital.whitesquirrel.wordsapp",
				infoPlist: {
					ITSAppUsesNonExemptEncryption: false,
				},
			},
			android: {
				adaptiveIcon: {
					backgroundColor: "#E6F4FE",
					foregroundImage: "./assets/images/android-icon-foreground.png",
					backgroundImage: "./assets/images/android-icon-background.png",
					monochromeImage: "./assets/images/android-icon-monochrome.png",
				},
				edgeToEdgeEnabled: true,
				predictiveBackGestureEnabled: false,
				package: "digital.whitesquirrel.wordsapp",
			},
			web: {
				output: "static",
				favicon: "./assets/images/favicon.png",
			},
			plugins: [
				["@lovesworking/watermelondb-expo-plugin-sdk-52-plus"],
				[
					"expo-dev-client",
					{
						launchMode: "most-recent",
					},
				],
				"expo-router",
				[
					"expo-splash-screen",
					{
						image: "./assets/images/splash-icon.png",
						imageWidth: 200,
						resizeMode: "contain",
						backgroundColor: "#ffffff",
						dark: {
							backgroundColor: "#000000",
						},
					},
				],
			],
			experiments: {
				typedRoutes: true,
				reactCompiler: true,
			},
			extra: {
				router: {},
				eas: {
					projectId: "085b8901-c946-419d-9ff6-d370219dd5dd",
				},
				API_SERVER:
					process.env.API_SERVER ??
					(process.env.NODE_ENV === "production"
						? "https://api.yourdomain.com"
						: "http://192.168.1.42:3001"),
			},
			owner: "vvruspat",
		},
	};
};
