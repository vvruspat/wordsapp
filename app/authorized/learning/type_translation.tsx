import { TrainingAppWrapper } from "@/components/TrainingAppWrapper";
import { useTranslation } from "react-i18next";

export default function TypeTranslation() {
	const { t } = useTranslation();

	return (
		<TrainingAppWrapper
			title={t("app_type_translation_header")}
			exercise="type_translation"
		/>
	);
}
