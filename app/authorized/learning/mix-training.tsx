import { TrainingAppWrapper } from "@/components/TrainingAppWrapper";
import { BackgroundContext } from "@/context/BackgroundContext";
import { useExercise } from "@/hooks/useExercise";
import { Colors } from "@/mob-ui/brand/colors";
import { useContext, useEffect } from "react";
import { ActivityIndicator } from "react-native";

export default function MixTraining() {
	const { setColor, setOpacity } = useContext(BackgroundContext);

	const { resultModals: ResultModals, currentTraining } = useExercise();

	useEffect(() => {
		setColor(Colors.backgrounds.cyan);
		setOpacity(1);

		return () => {
			setOpacity(0.3);
		};
	}, [setColor, setOpacity]);

	const TrainingComponent = currentTraining?.component;

	return (
		<TrainingAppWrapper title={currentTraining ? currentTraining.title : ""}>
			{currentTraining === null && <ActivityIndicator size="large" />}
			{TrainingComponent && currentTraining && (
				<TrainingComponent key={currentTraining.name} />
			)}
			<ResultModals />
		</TrainingAppWrapper>
	);
}
