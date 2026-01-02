import { TrainingAppWrapper } from "@/components/TrainingAppWrapper";
import { useTranslation } from "react-i18next";

export default function MatchWords() {
	const { t } = useTranslation();

	return (
		<TrainingAppWrapper
			title={t("app_match_words_header")}
			exercise="match_words"
		/>
	);
}
