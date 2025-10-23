import { ResultModalProvider } from "@/context/ResultModalContext";
import { Slot } from "expo-router";

export default function TrainingLayout() {
	return (
		<ResultModalProvider>
			<Slot />
		</ResultModalProvider>
	);
}
