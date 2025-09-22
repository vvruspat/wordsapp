import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WButton, WInput, WText } from "@/mob-ui";
import { styles } from "../general.styles";

export default function SignIn() {
	const router = useRouter();
	const { t } = useTranslation();

	return (
		<SafeAreaView mode="padding" style={styles.page}>
			<View style={styles.formWrapper}>
				<View style={styles.fieldsGroup}>
					<WText mode="primary" size="2xl">
						{t("label_your_email")}
					</WText>
					<WInput placeholder="example@domain.com" />
				</View>
				<WButton
					mode="primary"
					fullWidth
					onPress={() => router.push("/verify")}
				>
					<Text>{t("button_continue")}</Text>
				</WButton>
			</View>
		</SafeAreaView>
	);
}
