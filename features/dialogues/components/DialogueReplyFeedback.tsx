import { ActivityIndicator, Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";
import { WText } from "@/mob-ui";
import { Colors } from "@/mob-ui/brand/colors";

export function DialogueReplyFeedback({
	status,
	onRetry,
}: {
	status?: { type: string; reason?: string };
	onRetry?: () => void;
}) {
	const { t } = useTranslation();
	if (status?.type === "running")
		return <ActivityIndicator color={Colors.primary.base} size="small" />;
	if (status?.type !== "incomplete" || status.reason !== "error") return null;
	return (
		<View style={{ gap: 8 }}>
			<WText wrap style={{ color: Colors.accents.red }}>
				{t("dialogue_reply_error")}
			</WText>
			<Pressable
				accessibilityRole="button"
				disabled={!onRetry}
				onPress={onRetry}
				style={{ minHeight: 44, justifyContent: "center" }}
			>
				<WText style={{ color: Colors.primary.base }}>
					{t("button_retry")}
				</WText>
			</Pressable>
		</View>
	);
}
