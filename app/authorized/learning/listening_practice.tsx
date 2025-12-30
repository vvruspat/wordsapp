import { TrainingAppWrapper } from "@/components/TrainingAppWrapper";
import { ListeningPracticeExercise } from "@/components/TrainingExercises";
import { BackgroundContext } from "@/context/BackgroundContext";
import { useExercise } from "@/hooks/useExercise";
import { Colors } from "@/mob-ui/brand/colors";
import { useContext, useEffect } from "react";
import { useTranslation } from "react-i18next";

export default function ListeningPractice() {
	const { setColor, setOpacity } = useContext(BackgroundContext);

	const { t } = useTranslation();

	const { resultModals: ResultModals } = useExercise("listening_practice");

	useEffect(() => {
		setColor(Colors.backgrounds.yellow);
		setOpacity(1);

		return () => {
			setOpacity(0.3);
		};
	}, [setColor, setOpacity]);

	return (
		<TrainingAppWrapper title={t("app_listening_practice_header")}>
			<ListeningPracticeExercise />
			<ResultModals />
		</TrainingAppWrapper>
	);
}
