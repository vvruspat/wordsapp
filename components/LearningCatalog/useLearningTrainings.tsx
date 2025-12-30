import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { trainingComponents } from "./components";
import type { LearningCatalogItem } from "./types";

export function useLearningTrainings(): readonly LearningCatalogItem[] {
	const { t } = useTranslation();

	return useMemo<LearningCatalogItem[]>(
		() => [
			{
				id: 1,
				created_at: "2023-01-01T00:00:00Z",
				title: t("app_true_or_false_title"),
				description: t("app_true_or_false_description"),
				score: 0,
				name: "true_or_false",
				image: "",
				component: trainingComponents.true_or_false,
			},
			{
				id: 2,
				created_at: "2023-01-02T00:00:00Z",
				title: t("app_choose_translation_title"),
				description: t("app_choose_translation_description"),
				score: 0,
				name: "choose_translation",
				image: "",
				component: trainingComponents.choose_translation,
			},
			{
				id: 3,
				created_at: "2023-01-03T00:00:00Z",
				title: t("app_type_translation_title"),
				description: t("app_type_translation_description"),
				score: 0,
				name: "type_translation",
				image: "",
				component: trainingComponents.type_translation,
			},
			{
				id: 4,
				created_at: "2023-01-04T00:00:00Z",
				title: t("app_match_words_title"),
				description: t("app_match_words_description"),
				score: 0,
				name: "match_words",
				image: "",
				component: trainingComponents.match_words,
			},
			{
				id: 5,
				created_at: "2023-01-04T00:00:00Z",
				title: t("app_listening_practice_title"),
				description: t("app_listening_practice_description"),
				score: 0,
				name: "listening_practice",
				image: "",
				component: trainingComponents.listening_practice,
			},
		],
		[t],
	);
}
