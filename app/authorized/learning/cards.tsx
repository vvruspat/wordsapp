import { useTranslation } from "react-i18next";
import { TrainingAppWrapper } from "@/components/TrainingAppWrapper";

export default function Cards() {
	const { t } = useTranslation();

	return <TrainingAppWrapper title={t("app_cards_header")} exercise="cards" />;
}
