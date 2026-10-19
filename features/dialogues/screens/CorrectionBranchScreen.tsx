import { useCorrectionBranch } from "../hooks/useCorrectionBranch";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import {
	ActivityIndicator,
	KeyboardAvoidingView,
	Platform,
	Pressable,
	View,
} from "react-native";
import { WText } from "@/mob-ui";
import { Colors } from "@/mob-ui/brand/colors";

export default function CorrectionBranchScreen() {
	const { router, t, user, branch, setBranch, error, setLoadAttempt } =
		useCorrectionBranch();

	return (
		<KeyboardAvoidingView
			behavior={Platform.OS === "ios" ? "padding" : "height"}
			style={styles.page}
		>
			<View style={styles.header}>
				<Pressable style={styles.back} onPress={() => router.back()}>
					<FontAwesome5 name="chevron-left" color={Colors.greys.white} />
				</Pressable>
				<View style={{ flex: 1 }}>
					<WText weight="semibold">{t("dialogue_correction_review")}</WText>
					{branch ? (
						<WText size="xs" mode="tertiary" numberOfLines={1}>
							{branch.correction.original} → {branch.correction.corrected}
						</WText>
					) : null}
				</View>
			</View>
			{branch && user?.userId ? (
				<BranchThread
					key={branch.thread.id}
					branch={branch}
					userId={user.userId}
					onBranchChange={setBranch}
				/>
			) : (
				<View style={styles.center}>
					{error ? (
						<View style={{ gap: 16, alignItems: "center" }}>
							<WText style={{ color: Colors.accents.red }} wrap>
								{error}
							</WText>
							<Pressable
								onPress={() => setLoadAttempt((attempt) => attempt + 1)}
							>
								<WText style={{ color: Colors.primary.base }}>
									{t("button_retry")}
								</WText>
							</Pressable>
						</View>
					) : (
						<ActivityIndicator color={Colors.primary.base} />
					)}
				</View>
			)}
		</KeyboardAvoidingView>
	);
}

import { BranchThread } from "../components/BranchThread";
import { styles } from "../components/branch.styles";
