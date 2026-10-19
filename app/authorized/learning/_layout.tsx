import { Slot, usePathname } from "expo-router";
import { ExerciseProvider } from "@/features/training/components/ExerciseProvider";

export default function TrainingLayout() {
	const mode =
		usePathname() === "/authorized/learning/mix-training" ? "mixed" : "single";
	return (
		<ExerciseProvider mode={mode}>
			<Slot />
		</ExerciseProvider>
	);
}
