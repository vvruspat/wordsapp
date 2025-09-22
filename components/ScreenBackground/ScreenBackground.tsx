import { useContext, useId } from "react";
import Svg, { Defs, G, RadialGradient, Rect, Stop } from "react-native-svg";
import { BackgroundContext } from "@/context/BackgroundContext";
import { Colors } from "@/mob-ui/brand/colors";

export const ScreenBackground = () => {
	const { color, opacity } = useContext(BackgroundContext);

	const id = useId();
	const gradientId = `gradient-${id}`;

	return (
		<Svg width="100%" height="100%" viewBox="0 0 393 852" fill="none">
			<G opacity={opacity}>
				<Rect
					width="393"
					height="852"
					fill={Colors.backgrounds.primaryBackground}
				/>
				<Rect
					width="393"
					height="852"
					fill={`url(#${gradientId})`}
					fillOpacity="0.5"
				/>
			</G>
			<Defs>
				<RadialGradient
					id={gradientId}
					cx="0"
					cy="0"
					r="1"
					gradientTransform="matrix(-457.5 1019.17 -503.55 -1058.85 381 6.77014)"
					gradientUnits="userSpaceOnUse"
				>
					<Stop stopColor={color} />
					<Stop offset="1" stopOpacity="0" />
				</RadialGradient>
			</Defs>
		</Svg>
	);
};
