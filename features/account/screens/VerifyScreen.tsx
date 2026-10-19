import { useVerify } from "../hooks/useVerify";
import { AntDesign } from "@expo/vector-icons";
import {
	KeyboardAvoidingView,
	Platform,
	Pressable,
	Text,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WAlert, WButton, WCharInput, WText, WTimer } from "@/mob-ui";
import { styles } from "@/general.styles";

const PIN_LENGTH = 4;

export default function Verify() {
	const {
		router,
		error,
		isReadyToResend,
		setIsReadyToResend,
		t,
		onCodeChangeHandler,
		onCodeResendHandler,
	} = useVerify();
	return (
		<SafeAreaView mode="padding" style={styles.page}>
			<Pressable onPress={() => router.back()} style={{ padding: 8 }}>
				<AntDesign name="arrow-left" size={24} color="white" />
			</Pressable>
			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : "height"}
				style={{ flex: 1, width: "100%" }}
			>
				<View style={styles.formWrapper}>
					{error && <WAlert mode="error">{error}</WAlert>}

					<WText mode="primary" size="2xl" align="center">
						{t("verify_enter_code")}
					</WText>

					<WCharInput
						length={PIN_LENGTH}
						secureTextEntry={false}
						keyboardType="visible-password"
						onChangeText={onCodeChangeHandler}
					/>

					{!isReadyToResend && (
						<WTimer
							mode="primary"
							duration={180}
							onComplete={() => setIsReadyToResend(true)}
						/>
					)}

					<View style={{ gap: 24, width: "100%" }}>
						<WButton
							mode="tertiary"
							onPress={onCodeResendHandler}
							disabled={!isReadyToResend}
						>
							<Text>{t("resend_code")}</Text>
						</WButton>
					</View>
				</View>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
}
