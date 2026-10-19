import { useContext, useEffect, useState } from "react";
import {
	WCharInput,
	type WCharInputProps,
} from "@/mob-ui/molecules/WCharInput/WCharInput";
import { ExerciseContext } from "@/shared/training/events";
export function TrainingCharInput(props: WCharInputProps) {
	const { addCompleteListener, removeCompleteListener } =
		useContext(ExerciseContext);
	const [resetKey, setResetKey] = useState(0);
	useEffect(() => {
		const reset = () => setResetKey((value) => value + 1);
		addCompleteListener(reset);
		return () => removeCompleteListener(reset);
	}, [addCompleteListener, removeCompleteListener]);
	return <WCharInput {...props} resetKey={resetKey} />;
}
