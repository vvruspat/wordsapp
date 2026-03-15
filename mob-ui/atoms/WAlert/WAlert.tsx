import { View } from "react-native";
import { WText } from "../WText";
import { styles } from "./WAlert.styles";

export type WAlertMode = "error" | "success" | "warning" | "info";

export interface WAlertProps {
	mode: WAlertMode;
	children: React.ReactNode;
}

const modeKey: Record<WAlertMode, "Error" | "Success" | "Warning" | "Info"> = {
	error: "Error",
	success: "Success",
	warning: "Warning",
	info: "Info",
};

export const WAlert = ({ mode, children }: WAlertProps) => {
	const key = modeKey[mode];

	return (
		<View style={[styles.container, styles[`container${key}`]]}>
			<WText style={[styles.text, styles[`text${key}`]]} size="sm">
				{children}
			</WText>
		</View>
	);
};
