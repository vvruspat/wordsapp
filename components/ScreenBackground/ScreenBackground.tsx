import { BackgroundContext } from "@/context/BackgroundContext";
import { Colors } from "@/mob-ui/brand/colors";
import { useContext, useId } from "react";
import { useWindowDimensions } from "react-native";
import Svg, { Defs, G, RadialGradient, Rect, Stop } from "react-native-svg";

export const ScreenBackground = () => {
	const { color, opacity } = useContext(BackgroundContext);
	const { width, height } = useWindowDimensions();

	const id = useId();
	const gradientId = `gradient-${id}`;

	return (
		<Svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} fill="none">
			<G opacity={opacity}>
				<Rect
					width={width}
					height={height}
					fill={Colors.backgrounds.primaryBackground}
				/>
				<Rect
					width={width}
					height={height}
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
