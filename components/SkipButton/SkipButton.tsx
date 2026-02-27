import AntDesign from "@expo/vector-icons/AntDesign";
import { Pressable, StyleSheet } from "react-native";
import { Colors } from "@/mob-ui/brand/colors";

export type SkipButtonProps = {
	onPress: () => void;
};

export function SkipButton({ onPress }: SkipButtonProps) {
	return (
		<Pressable style={styles.button} onPress={onPress}>
			<AntDesign name="step-forward" size={16} color={Colors.greys.grey6} />
		</Pressable>
	);
}

const styles = StyleSheet.create({
	button: {
		padding: 8,
	},
});
