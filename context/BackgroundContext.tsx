import { createContext, ReactNode, useState } from "react";
import { Colors } from "@/mob-ui/brand/colors";

type BackgroundContextType = {
	color: (typeof Colors.backgrounds)[keyof typeof Colors.backgrounds];
	opacity: number;
	setColor: (c: BackgroundContextType["color"]) => void;
	setOpacity: (o: number) => void;
};

const BackgroundContext = createContext<BackgroundContextType>({
	color: Colors.backgrounds.green,
	opacity: 0.3,
	setColor: () => {},
	setOpacity: () => {},
});

export { BackgroundContext };
type BackgroundProviderProps = { children?: ReactNode };

type BackgroundContextValue = BackgroundContextType & {
	setColor: (c: BackgroundContextType["color"]) => void;
};

export const BackgroundProvider = ({ children }: BackgroundProviderProps) => {
	const [color, setColor] = useState<BackgroundContextType["color"]>(
		Colors.backgrounds.green,
	);

	const [opacity, setOpacity] = useState(0.3);

	const value: BackgroundContextValue = {
		color,
		opacity,
		setColor,
		setOpacity,
	};

	return (
		<BackgroundContext.Provider value={value}>
			{children}
		</BackgroundContext.Provider>
	);
};
