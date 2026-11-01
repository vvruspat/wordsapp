import "dotenv/config";

export default ({ config }) => {
	const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
	if (
		googleIosClientId &&
		!/^[a-zA-Z0-9-]+\.apps\.googleusercontent\.com$/.test(googleIosClientId)
	) {
		throw new Error(
			"EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID must be an iOS OAuth client ID",
		);
	}
	return {
		...config,
		expo: {
			name: "ParaNoun",
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
				usesAppleSignIn: true,
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
				predictiveBackGestureEnabled: false,
				package: "digital.whitesquirrel.wordsapp",
			},
			web: {
				output: "static",
				favicon: "./assets/images/favicon.png",
			},
			plugins: [
				"expo-apple-authentication",
				["./plugins/withGoogleSignIn", { iosClientId: googleIosClientId }],
				"./plugins/withSchedulerLifetimeFix",
				"expo-navigation-bar",
				"expo-asset",
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
						image: "./assets/images/paranoun-splash-logo.png",
						imageWidth: 300,
						resizeMode: "contain",
						backgroundColor: "#0d1f0d",
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
			},
			owner: "vvruspat",
		},
	};
};
