import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import { WText } from "@/mob-ui";
import { styles } from "../../general.styles";

export default function Settings() {
	const { t } = useTranslation();
	return (
		<SafeAreaView mode="padding" style={styles.page}>
			<WText mode="primary" size="2xl">
				{t("settings_title")}
			</WText>
		</SafeAreaView>
	);
}
