import { useTranslation } from "react-i18next";
import { TrainingAppWrapper } from "@/components/TrainingAppWrapper";

export default function ChooseTranslation() {
	const { t } = useTranslation();

	return (
		<TrainingAppWrapper
			title={t("app_choose_translation_header")}
			exercise="choose_translation"
		/>
	);
}
