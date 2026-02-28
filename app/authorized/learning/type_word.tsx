import { useTranslation } from "react-i18next";
import { TrainingAppWrapper } from "@/components/TrainingAppWrapper";

export default function TypeWord() {
	const { t } = useTranslation();

	return (
		<TrainingAppWrapper
			title={t("app_type_word_header")}
			exercise="type_word"
		/>
	);
}
