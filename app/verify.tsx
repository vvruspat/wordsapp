import { authenticateAsync } from "expo-local-authentication";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WCharInput, WText } from "@/mob-ui";
import { styles } from "../general.styles";

const PIN_LENGTH = 4;

export default function Verify() {
	const router = useRouter();

	const { t } = useTranslation();

	return (
		<SafeAreaView mode="padding" style={styles.page}>
			<View style={styles.formWrapper}>
				<WText mode="primary" size="2xl" align="center">
					{t("verify_enter_code")}
				</WText>

				<WCharInput
					length={PIN_LENGTH}
					secureTextEntry={false}
					keyboardType="visible-password"
					onChangeText={async (text) => {
						if (text.length === PIN_LENGTH) {
							// verify code with backend
							// if success:

							await SecureStore.setItemAsync("userId", "1"); // mock user ID
							await authenticateAsync({
								promptMessage: "Authenticate to access the app",
							}).then((result) => {
								if (!result.success) {
									router.push("/");
								} else {
									router.push("/authorized/learning");
								}
							});
							router.push("/authorized/learning");
						}
					}}
				/>
			</View>
		</SafeAreaView>
	);
}
