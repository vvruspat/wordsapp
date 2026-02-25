import { TrainingAppWrapper } from "@/components/TrainingAppWrapper";
import { useTranslation } from "react-i18next";

export default function TypeWord() {
	const { t } = useTranslation();

	return (
		<TrainingAppWrapper
			title={t("app_type_word_header")}
			exercise="type_word"
		/>
	);
}
