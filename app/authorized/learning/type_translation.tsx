import { TrainingAppWrapper } from "@/components/TrainingAppWrapper";
import { TypeTranslationExercise } from "@/components/TrainingExercises";
import { BackgroundContext } from "@/context/BackgroundContext";
import { useExercise } from "@/hooks/useExercise";
import { Colors } from "@/mob-ui/brand/colors";
import { useContext, useEffect } from "react";
import { useTranslation } from "react-i18next";

export default function TypeTranslation() {
	const { setColor, setOpacity } = useContext(BackgroundContext);
	const { t } = useTranslation();
	const { resultModals: ResultModals } = useExercise("type_translation");

	useEffect(() => {
		setColor(Colors.backgrounds.blue);
		setOpacity(1);

		return () => {
			setOpacity(0.3);
		};
	}, [setColor, setOpacity]);

	return (
		<TrainingAppWrapper title={t("app_type_translation_header")}>
			<TypeTranslationExercise />
			<ResultModals />
		</TrainingAppWrapper>
	);
}
