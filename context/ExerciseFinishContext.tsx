import { createContext, ReactNode, useCallback, useRef } from "react";

type ExerciseFinishContextType = {
	registerFinishCallback: (callback: () => void) => void;
	triggerFinish: () => void;
};

const ExerciseFinishContext = createContext<ExerciseFinishContextType>({
	registerFinishCallback: () => {},
	triggerFinish: () => {},
});

type ExerciseFinishProviderProps = { children?: ReactNode };

export const ExerciseFinishProvider = ({
	children,
}: ExerciseFinishProviderProps) => {
	const finishCallbackRef = useRef<(() => void) | null>(null);

	const registerFinishCallback = useCallback((callback: () => void) => {
		finishCallbackRef.current = callback;
	}, []);

	const triggerFinish = useCallback(() => {
		finishCallbackRef.current?.();
	}, []);

	const value: ExerciseFinishContextType = {
		registerFinishCallback,
		triggerFinish,
	};

	return (
		<ExerciseFinishContext.Provider value={value}>
			{children}
		</ExerciseFinishContext.Provider>
	);
};

export { ExerciseFinishContext };

