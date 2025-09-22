import { View } from "react-native";
import { WText } from "../WText";

export const WAppHeader = ({ route }: { route: string }) => {
	return (
		<View
			style={{
				flex: 1,
				justifyContent: "center",
				alignItems: "center",
			}}
		>
			<WText size="lg" weight="bold" mode="primary">
				{route}
			</WText>
		</View>
	);
};
