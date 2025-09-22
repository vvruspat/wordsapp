import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WButton, WInput } from "@/mob-ui";
import { styles } from "../general.styles";

export default function SignUp() {
	const router = useRouter();

	const { t } = useTranslation();

	const handleContinueClick = () => {
		// send email
		router.push("/verify");
	};

	return (
		<SafeAreaView mode="padding" style={styles.page}>
			<View style={styles.formWrapper}>
				<View style={styles.fieldsGroup}>
					<WInput placeholder={t("placeholder_name")} label={t("label_name")} />
					<WInput placeholder="example@domain.com" label={t("label_email")} />
				</View>
				<WButton mode="primary" fullWidth onPress={handleContinueClick}>
					<Text>{t("button_continue")}</Text>
				</WButton>
			</View>
		</SafeAreaView>
	);
}
