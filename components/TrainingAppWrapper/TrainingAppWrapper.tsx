import AntDesign from "@expo/vector-icons/AntDesign";
import { Link } from "expo-router";
import { View } from "react-native";
import {
	SafeAreaView,
	SafeAreaViewProps,
} from "react-native-safe-area-context";
import { styles } from "@/general.styles";
import { WText } from "@/mob-ui";
import { Colors } from "@/mob-ui/brand/colors";
import { trainingAppWrapperStyles } from "./TrainingAppWrapper.styles";

type TrainingAppWrapperProps = SafeAreaViewProps & {
	title: string;
};

export const TrainingAppWrapper = ({
	title,
	children,
	style,
	...restViewProps
}: TrainingAppWrapperProps) => {
	return (
		<SafeAreaView
			mode="padding"
			style={[styles.page, style]}
			{...restViewProps}
		>
			<View style={trainingAppWrapperStyles.headerRow}>
				<WText mode="primary" size="2xl" style={trainingAppWrapperStyles.title}>
					{title}
				</WText>
				<Link
					href="/authorized/learning"
					style={trainingAppWrapperStyles.closeLink}
				>
					<AntDesign name="close" size={16} color={Colors.greys.white} />
				</Link>
			</View>
			{children}
		</SafeAreaView>
	);
};

export default TrainingAppWrapper;
