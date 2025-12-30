import { ExerciseFinishProvider } from "@/context/ExerciseFinishContext";
import { ResultModalProvider } from "@/context/ResultModalContext";
import { Slot } from "expo-router";

export default function TrainingLayout() {
	return (
		<ResultModalProvider>
			<ExerciseFinishProvider>
				<Slot />
			</ExerciseFinishProvider>
		</ResultModalProvider>
	);
}
