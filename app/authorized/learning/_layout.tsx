import { ExerciseProvider } from "@/context/ExerciseContext";
import { Slot } from "expo-router";

export default function TrainingLayout() {
	return (
		<ExerciseProvider>
			<Slot />
		</ExerciseProvider>
	);
}
