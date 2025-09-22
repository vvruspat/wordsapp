import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WButton } from "@/mob-ui";
import { styles } from "../general.styles";

export default function Index() {
	const router = useRouter();
	const { t } = useTranslation();

	return (
		<SafeAreaView mode="padding" style={styles.page}>
			<View
				style={{
					flexDirection: "column",
					gap: 16,
					width: "100%",
					alignItems: "center",
					justifyContent: "center",
				}}
			>
				<WButton
					mode="primary"
					fullWidth
					onPress={() => router.push("/signin")}
				>
					<Text>{t("button_sign_in")}</Text>
				</WButton>
				<WButton
					mode="secondary"
					fullWidth
					onPress={() => router.push("/signup")}
				>
					<Text>{t("button_sign_up")}</Text>
				</WButton>
			</View>
		</SafeAreaView>
	);
}
