import { useEffect, useState } from "react";
import { wordsService } from "./wordsService";
import { logger } from "@/utils/logger";
export function useAcceptedAnswers(
	kind: "words" | "translations",
	wordId?: number,
	wordLanguage?: string,
	translationLanguage?: string,
	translationText?: string,
) {
	const [answers, setAnswers] = useState<string[]>([]);
	useEffect(() => {
		let active = true;
		setAnswers([]);
		if (!wordId || !wordLanguage || !translationLanguage) return;
		const request =
			kind === "words"
				? wordsService.acceptedWords(
						wordId,
						wordLanguage,
						translationText ?? "",
						translationLanguage,
					)
				: wordsService.acceptedTranslations(
						wordId,
						wordLanguage,
						translationLanguage,
					);
		void request
			.then((value) => {
				if (active) setAnswers(value);
			})
			.catch((error) => {
				logger.error("Unable to prepare alternate answers", error, "db");
			});
		return () => {
			active = false;
		};
	}, [kind, wordId, wordLanguage, translationLanguage, translationText]);
	return answers;
}
