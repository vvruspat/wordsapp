import { TrainingAppWrapper } from "@/components/TrainingAppWrapper";
import { ChooseTranslationExercise } from "@/components/TrainingExercises";
import { BackgroundContext } from "@/context/BackgroundContext";
import { useExercise } from "@/hooks/useExercise";
import { Colors } from "@/mob-ui/brand/colors";
import { useContext, useEffect } from "react";
import { useTranslation } from "react-i18next";

export default function ChooseTranslation() {
	const { setColor, setOpacity } = useContext(BackgroundContext);
	const { t } = useTranslation();

	useEffect(() => {
		setColor(Colors.backgrounds.cyan);
		setOpacity(1);

		return () => {
			setOpacity(0.3);
		};
	}, [setColor, setOpacity]);

	const { resultModals: ResultModals } = useExercise("choose_translation");

	return (
		<TrainingAppWrapper title={t("app_choose_translation_header")}>
			<ChooseTranslationExercise />
			<ResultModals />
		</TrainingAppWrapper>
	);
}
