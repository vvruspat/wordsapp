import { ReactNode } from "react";
import { View, ViewProps } from "react-native";
import { styles } from "./WCard.styles";

type WCard = ViewProps & {
	header?: ReactNode;
	footer?: ReactNode;
};

export const WCard = ({ header, footer, children, style, ...rest }: WCard) => {
	return (
		<View style={[styles.card, style]} {...rest}>
			{header && <View>{header}</View>}
			{children}
			{footer && <View>{footer}</View>}
		</View>
	);
};
