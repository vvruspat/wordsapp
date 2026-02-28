import { useTranslation } from "react-i18next";
import { TrainingAppWrapper } from "@/components/TrainingAppWrapper";

export default function ListeningPractice() {
	const { t } = useTranslation();

	return (
		<TrainingAppWrapper
			title={t("app_listening_practice_header")}
			exercise="listening_practice"
		/>
	);
}
