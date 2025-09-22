import { useContext, useId } from "react";
import { Ellipse, FeGaussianBlur, Filter, Svg } from "react-native-svg";
import { BackgroundContext } from "@/context/BackgroundContext";

export const GlowingEllipse = () => {
	const { color } = useContext(BackgroundContext);

	const id = useId();
	const filterId = `filter-${id}`;

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
