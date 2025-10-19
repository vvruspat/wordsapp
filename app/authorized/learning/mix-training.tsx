import {
	LearningCatalogItem,
	useLearningTrainings,
} from "@/components/LearningCatalog";
import { BackgroundContext } from "@/context/BackgroundContext";
import { Colors } from "@/mob-ui/brand/colors";
import { useCallback, useContext, useEffect, useState } from "react";
import { ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { styles } from "../../../general.styles";

export default function MixTraining() {
	const { setColor, setOpacity } = useContext(BackgroundContext);
	const [currentTraining, setCurrentTraining] =
		useState<LearningCatalogItem | null>(null);
	const trainings = useLearningTrainings();

	const onFinish = useCallback(() => {
		setCurrentTraining(trainings[Math.floor(Math.random() * trainings.length)]);
	}, [trainings]);

	useEffect(() => {
		setCurrentTraining(trainings[Math.floor(Math.random() * trainings.length)]);
	}, [trainings]);

	useEffect(() => {
		setColor(Colors.backgrounds.cyan);
		setOpacity(1);

		return () => {
			setOpacity(0.3);
		};
	}, [setColor, setOpacity]);

	return (
		<SafeAreaView mode="padding" style={styles.page}>
			{currentTraining === null && <ActivityIndicator size="large" />}
			{currentTraining && <currentTraining.component onFinish={onFinish} />}
		</SafeAreaView>
	);
}
