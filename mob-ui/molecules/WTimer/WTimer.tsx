import { WText, WTextProps } from "@/mob-ui/atoms";
import { useEffect, useRef, useState } from "react";

type WTimerProps = WTextProps & {
	startTime?: number;
	duration?: number;
	isCountingUp?: boolean;
	onComplete?: () => void;
};

export const WTimer = ({
	startTime = 0,
	duration = 60,
	isCountingUp = false,
	onComplete,
	...textProps
}: WTimerProps) => {
	const timer = useRef<number | null>(null);
	const [currentTime, setCurrentTime] = useState(startTime);

	// Sync prop startTime into local state when it changes
	useEffect(() => {
		if (timer.current) {
			clearInterval(timer.current);
		}
		setCurrentTime(startTime);
	}, [startTime]);

	// Start/stop interval only when counting direction changes
	useEffect(() => {
		timer.current = window.setInterval(() => {
			setCurrentTime((prevCurrentTime) =>
				isCountingUp ? prevCurrentTime + 1 : prevCurrentTime - 1,
			);
		}, 1000);

		return () => {
			if (timer.current) {
				clearInterval(timer.current);
			}
		};
	}, [isCountingUp]);

	// Handle completion
	useEffect(() => {
		if (
			(!isCountingUp && currentTime <= 0) ||
			(isCountingUp && currentTime >= duration)
		) {
			if (timer.current) {
				clearInterval(timer.current);
			}
			onComplete?.();
		}
	}, [currentTime, isCountingUp, duration, onComplete]);

	const minutes = Math.floor(currentTime / 60);
	const seconds = currentTime % 60;
	const formattedTime = `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;

	return <WText {...textProps}>{formattedTime}</WText>;
};
