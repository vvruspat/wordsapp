import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { styles } from "./WZStack.styles";

export type ZStackProps = {
	children: React.ReactNode;
	style?: ViewStyle;
};

export const WZStack = ({ children, style }: ZStackProps) => {
	const wrappedChildren = React.Children.map(children, (child, index) => (
		<View
			// biome-ignore lint/suspicious/noArrayIndexKey: No other key available
			key={index}
			style={StyleSheet.absoluteFill}
		>
			{child}
		</View>
	));

	return <View style={[styles.container, style]}>{wrappedChildren}</View>;
};
