import { WText } from "@/mob-ui";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import { styles } from "../../general.styles";

export default function Profile() {
	const { t } = useTranslation();
	return (
		<SafeAreaView mode="padding" style={styles.page}>
			<WText mode="primary" size="2xl">
				{t("profile_title")}
			</WText>
		</SafeAreaView>
	);
}
