import { useContext, useId } from "react";
import { Platform } from "react-native";
import { Ellipse, FeGaussianBlur, Filter, Svg } from "react-native-svg";
import { BackgroundContext } from "@/context/BackgroundContext";

export const GlowingEllipse = () => {
	const { color } = useContext(BackgroundContext);

	const id = useId();
	const filterId = `filter-${id}`;

	if (Platform.OS === "android") {
		// Android: FeGaussianBlur relies on deprecated RenderScript (Android 12+).
		// Simulate the glow by layering concentric semi-transparent ellipses.
		return (
			<Svg width="353" height="129" viewBox="0 0 353 129" fill="none">
				<Ellipse cx="173" cy="-17" rx="240" ry="130" fill={color} fillOpacity="0.02" />
				<Ellipse cx="173" cy="-17" rx="210" ry="106" fill={color} fillOpacity="0.05" />
				<Ellipse cx="173" cy="-17" rx="180" ry="76" fill={color} fillOpacity="0.12" />
				<Ellipse cx="173" cy="-17" rx="150" ry="46" fill={color} fillOpacity="0.35" />
				<Ellipse cx="173" cy="-17" rx="120" ry="36" fill={color} fillOpacity="0.60" />
				<Ellipse cx="173" cy="-17" rx="90" ry="28" fill={color} fillOpacity="0.80" />
				<Ellipse cx="173" cy="-17" rx="60" ry="20" fill={color} fillOpacity="0.90" />
			</Svg>
		);
	}

	return (
		<Svg width="353" height="129" viewBox="0 0 353 129" fill="none">
			<Filter
				id={filterId}
				x="-55"
				y="-163"
				width="456"
				height="292"
				filterUnits="userSpaceOnUse"
				color-interpolation-filters="sRGB"
			>
				<FeGaussianBlur
					stdDeviation="30"
					result="effect1_foregroundBlur_226_2385"
					edgeMode="duplicate"
				/>
			</Filter>
			<Ellipse
				cx="173"
				cy="-17"
				rx="150"
				ry="46"
				fill={color}
				fillOpacity="1"
				filter={`url(#${filterId})`}
			/>
		</Svg>
	);
};

export default GlowingEllipse;
