import { ComposerPrimitive, useAuiState } from "@assistant-ui/react-native";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import {
	ActivityIndicator,
	type StyleProp,
	View,
	type ViewStyle,
} from "react-native";
import { Colors } from "@/mob-ui/brand/colors";

export function DialogueSendButton({
	online,
	style,
}: {
	online: boolean;
	style: StyleProp<ViewStyle>;
}) {
	const isRunning = useAuiState((state) => state.thread.isRunning);
	return (
		<ComposerPrimitive.Send
			style={style}
			disabled={online ? undefined : true}
			accessibilityState={{ busy: isRunning }}
		>
			{/* Keep touch ownership on the button; pressing must not replace the
			    native child before the release event submits the message. */}
			<View pointerEvents="none">
				{isRunning ? (
					<ActivityIndicator color={Colors.greys.grey10} />
				) : (
					<FontAwesome5 name="arrow-up" size={16} color={Colors.greys.grey10} />
				)}
			</View>
		</ComposerPrimitive.Send>
	);
}
