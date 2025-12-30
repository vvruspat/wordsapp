import { TrainingAppWrapper } from "@/components/TrainingAppWrapper";
import { TrueOrFalseExercise } from "@/components/TrainingExercises";
import { BackgroundContext } from "@/context/BackgroundContext";
import { useExercise } from "@/hooks/useExercise";
import { Colors } from "@/mob-ui/brand/colors";
import { useContext, useEffect } from "react";
import { useTranslation } from "react-i18next";

export default function TrueOrFalse() {
	const { setColor, setOpacity } = useContext(BackgroundContext);
	const { t } = useTranslation();
	const { resultModals: ResultModals } = useExercise("true_or_false");

	useEffect(() => {
		setColor(Colors.backgrounds.purple);
		setOpacity(1);

		return () => {
			setOpacity(0.3);
		};
	}, [setColor, setOpacity]);

	return (
		<TrainingAppWrapper title={t("app_true_or_false_header")}>
			<TrueOrFalseExercise />
			<ResultModals />
		</TrainingAppWrapper>
	);
}
