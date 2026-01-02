import { TrainingAppWrapper } from "@/components/TrainingAppWrapper";
import { useTranslation } from "react-i18next";

export default function ChooseTranslation() {
	const { t } = useTranslation();

	return (
		<TrainingAppWrapper
			title={t("app_choose_translation_header")}
			exercise="choose_translation"
		/>
	);
}
