import { useOperationScope } from "@/shared/lifecycle/useOperationScope";
import { logger } from "@/utils/logger";
import { wordsService } from "@/shared/vocabulary/wordsService";
import { useTrainingSelection } from "../model/trainingSelection";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import WatermelonWord from "@/db/models/Word";
import WatermelonWordTranslation from "@/db/models/WordTranslation";
import { learningRepository } from "@/db/repositories/learning.repository";
import { wordsRepository } from "@/db/repositories/words.repository";
import { useSessionUser } from "@/shared/session/useSession";

type WordPair = {
	word: WatermelonWord;
	translation: WatermelonWordTranslation;
};

function parseWordIds(raw: string | undefined): number[] {
	if (!raw) return [];
	return raw
		.split(",")
		.map(Number)
		.filter((n) => !Number.isNaN(n));
}

export function useWordIntro() {
	const { t } = useTranslation();
	const { wordIds } = useLocalSearchParams<{ wordIds: string }>();
	const { user } = useSessionUser();
	const { setChunkWordIds } = useTrainingSelection();

	const [pairs, setPairs] = useState<WordPair[]>([]);
	const [currentIndex, setCurrentIndex] = useState(0);
	const [typed, setTyped] = useState("");
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<unknown>(null);
	const [attempt, setAttempt] = useState(0);
	const busy = useRef(false);
	const begin = useOperationScope(
		JSON.stringify([
			user?.userId,
			user?.language_learn,
			user?.language_speak,
			wordIds,
		]),
	);

	useEffect(() => {
		const current = begin();
		let active = true;
		busy.current = false;
		setCurrentIndex(0);
		setTyped("");
		setError(null);
		setPairs([]);
		const ids = parseWordIds(wordIds);
		if (!ids.length || !user?.language_speak) {
			setLoading(false);
			return;
		}
		setLoading(true);
		const requestedAttempt = attempt;
		void wordsRepository
			.getByRemoteIds(ids, user.language_learn ?? "en")
			.then((words) =>
				wordsService.pairs(
					ids.flatMap((id) => words.filter((word) => word.remoteId === id)),
					user.language_speak ?? "en",
				),
			)
			.then((pairs) => {
				if (active && current() && requestedAttempt === attempt)
					setPairs(pairs);
			})
			.catch((reason) => {
				if (active && current()) setError(reason);
				logger.error("Unable to load intro words", reason, "db");
			})
			.finally(() => {
				if (active && current()) setLoading(false);
			});
		return () => {
			active = false;
		};
	}, [begin, wordIds, user?.language_speak, user?.language_learn, attempt]);

	const handleNext = useCallback(async () => {
		const pair = pairs[currentIndex];
		if (!pair || !user?.userId || busy.current) return;
		const current = begin();
		busy.current = true;
		setError(null);
		try {
			await learningRepository.recordIntro({
				userId: user.userId,
				wordId: pair.word.remoteId,
				translationId: pair.translation.remoteId,
			});

			if (!current()) return;
			const isLast = currentIndex === pairs.length - 1;

			if (!isLast) {
				setCurrentIndex((i) => i + 1);
				setTyped("");
				return;
			}

			const fallbackIds = parseWordIds(wordIds);
			const introducedIds = pairs.map((p) => p.word.remoteId);
			setChunkWordIds(introducedIds.length > 0 ? introducedIds : fallbackIds);
			router.replace("/authorized/learning/mix-training");
		} catch (reason) {
			if (current()) setError(reason);
			logger.error("Unable to persist intro result", reason, "db");
		} finally {
			busy.current = false;
		}
	}, [pairs, currentIndex, user, wordIds, setChunkWordIds, begin]);

	return {
		error,
		retry: () => setAttempt((value) => value + 1),
		t,
		pairs,
		currentIndex,
		typed,
		setTyped,
		loading,
		handleNext,
	};
}
