import {
	LearningCatalogItem,
	useLearningTrainings,
} from "@/components/LearningCatalog";
import {
	WordExcerciseFailureModal,
	WordExcerciseSuccessModal,
} from "@/components/Modals/WordExcerciseResult";
import { TrainingAppWrapper } from "@/components/TrainingAppWrapper";
import { BackgroundContext } from "@/context/BackgroundContext";
import { ResultModalContext } from "@/context/ResultModalContext";
import { Colors } from "@/mob-ui/brand/colors";
import { useCallback, useContext, useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

export default function MixTraining() {
	const { setColor, setOpacity } = useContext(BackgroundContext);

	const [currentTraining, setCurrentTraining] =
		useState<LearningCatalogItem | null>(null);
	const trainings = useLearningTrainings();

	const {
		successModalVisible,
		failureModalVisible,
		setSuccessModalVisible,
		setFailureModalVisible,
	} = useContext(ResultModalContext);

	const onFinish = useCallback(() => {
		setCurrentTraining(trainings[Math.floor(Math.random() * trainings.length)]);
	}, [trainings]);

	const onSuccessModalClose = useCallback(() => {
		setSuccessModalVisible(false);
		onFinish();
	}, [onFinish, setSuccessModalVisible]);

	const onFailureModalClose = useCallback(() => {
		setFailureModalVisible(false);
		onFinish();
	}, [onFinish, setFailureModalVisible]);

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
		<TrainingAppWrapper title={currentTraining ? currentTraining.title : ""}>
			{currentTraining === null && <ActivityIndicator size="large" />}
			{currentTraining && <currentTraining.component onFinish={onFinish} />}

			<View>
				<WordExcerciseSuccessModal
					visible={successModalVisible}
					onRequestClose={onSuccessModalClose}
				/>
				<WordExcerciseFailureModal
					visible={failureModalVisible}
					onRequestClose={onFailureModalClose}
				/>
			</View>
		</TrainingAppWrapper>
	);
}
