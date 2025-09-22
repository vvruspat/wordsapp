import React from "react";
import {
	Pressable,
	PressableProps,
	PressableStateCallbackType,
	Text,
} from "react-native";
import { wButtonStyles } from "./WButton.styles";

export interface WButtonProps extends PressableProps {
	mode:
		| "primary"
		| "secondary"
		| "tertiary"
		| "red"
		| "green"
		| "purple"
		| "dark";
	stretch?: boolean;
	fullWidth?: boolean;
}

export const WButton = ({
	mode,
	children,
	fullWidth = true,
	stretch = false,
	style,
	...props
}: WButtonProps) => {
	const mapChildren = (node: React.ReactNode) =>
		React.Children.map(node, (child) => {
			if (React.isValidElement(child) && child.type === Text) {
				const textProps = child.props as React.ComponentProps<typeof Text>;

				return React.cloneElement(
					child as React.ReactElement<React.ComponentProps<typeof Text>>,
					{
						style: [{ color: wButtonStyles[mode].color }, textProps.style],
					},
				);
			}
			return child;
		});

	const processedChildren =
		typeof children === "function"
			? (state: PressableStateCallbackType) => mapChildren(children(state))
			: mapChildren(children);

	return (
		<Pressable
			{...props}
			style={({ pressed, ...attr }) => [
				wButtonStyles.container,
				wButtonStyles[mode],
				pressed && wButtonStyles.containerPressed,
				stretch && wButtonStyles.stretch,
				fullWidth && wButtonStyles.fullWidth,
				typeof style === "function" ? style({ pressed, ...attr }) : style,
			]}
		>
			{processedChildren}
		</Pressable>
	);
};
