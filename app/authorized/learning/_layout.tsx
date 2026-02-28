import { Slot } from "expo-router";
import { ExerciseProvider } from "@/context/ExerciseContext";

export default function TrainingLayout() {
	return (
		<ExerciseProvider>
			<Slot />
		</ExerciseProvider>
	);
}
