import { TrainingAppWrapper } from "@/components/TrainingAppWrapper";
import { useTranslation } from "react-i18next";

export default function TrueOrFalse() {
	const { t } = useTranslation();

	return (
		<TrainingAppWrapper
			title={t("app_true_or_false_header")}
			exercise="true_or_false"
		/>
	);
}
