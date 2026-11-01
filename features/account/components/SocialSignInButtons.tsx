import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
	ActivityIndicator,
	Platform,
	StyleSheet,
	Text,
	View,
} from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import Svg, { Path } from "react-native-svg";
import type { SocialProvider } from "@/shared/session/socialAuth";
import { WButton, WText } from "@/mob-ui";
import { isGoogleConfigured } from "../services/socialProviders";

export function SocialSignInButtons({
	isBusy,
	pendingProvider,
	onSignIn,
}: {
	isBusy: boolean;
	pendingProvider: SocialProvider | null;
	onSignIn: (provider: SocialProvider) => Promise<void>;
}) {
	const { t } = useTranslation();
	const [appleAvailable, setAppleAvailable] = useState(false);
	const googleAvailable = isGoogleConfigured();
	useEffect(() => {
		let mounted = true;
		if (Platform.OS === "ios") {
			AppleAuthentication.isAvailableAsync().then(
				(available) => {
					if (mounted) setAppleAvailable(available);
				},
				() => {
					if (mounted) setAppleAvailable(false);
				},
			);
		}
		return () => {
			mounted = false;
		};
	}, []);
	if (!appleAvailable && !googleAvailable) return null;

	return (
		<View style={styles.group}>
			<View style={styles.divider}>
				<View style={styles.line} />
				<WText mode="secondary">{t("social_sign_in_or")}</WText>
				<View style={styles.line} />
			</View>
			{googleAvailable && (
				<WButton
					mode="tertiary"
					onPress={() => onSignIn("google")}
					disabled={isBusy}
					accessibilityState={{
						disabled: isBusy,
						busy: pendingProvider === "google",
					}}
					style={[styles.google, isBusy && styles.disabled]}
				>
					<Svg width={20} height={20} viewBox="0 0 48 48" accessible={false}>
						<Path
							fill="#EA4335"
							d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"
						/>
						<Path
							fill="#4285F4"
							d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6C44.4 38.03 46.98 31.85 46.98 24.55Z"
						/>
						<Path
							fill="#FBBC05"
							d="M10.53 28.59A14.41 14.41 0 0 1 9.77 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.87 23.87 0 0 0 0 24c0 3.87.93 7.53 2.56 10.78l7.97-6.19Z"
						/>
						<Path
							fill="#34A853"
							d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6c-2.15 1.45-4.92 2.3-8.18 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"
						/>
					</Svg>
					<Text style={styles.googleLabel}>{t("social_sign_in_google")}</Text>
				</WButton>
			)}
			{appleAvailable && (
				<View
					pointerEvents={isBusy ? "none" : "auto"}
					style={isBusy && styles.disabled}
				>
					<AppleAuthentication.AppleAuthenticationButton
						buttonType={
							AppleAuthentication.AppleAuthenticationButtonType.CONTINUE
						}
						buttonStyle={
							AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
						}
						cornerRadius={8}
						style={styles.apple}
						onPress={() => onSignIn("apple")}
						accessibilityState={{
							disabled: isBusy,
							busy: pendingProvider === "apple",
						}}
					/>
				</View>
			)}
			{pendingProvider !== null && (
				<ActivityIndicator
					accessibilityLabel={t("social_sign_in_loading")}
					color="white"
				/>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	group: { width: "100%", gap: 12 },
	divider: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
		marginBottom: 4,
	},
	line: { height: 1, flex: 1, backgroundColor: "#ffffff40" },
	google: {
		minHeight: 48,
		paddingVertical: 10,
		paddingHorizontal: 16,
		borderRadius: 8,
		flexDirection: "row",
		gap: 12,
	},
	googleLabel: { fontSize: 16, fontWeight: "500" },
	apple: { width: "100%", height: 48 },
	disabled: { opacity: 0.5 },
});
