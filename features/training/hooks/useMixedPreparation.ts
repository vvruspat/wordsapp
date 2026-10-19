import { useTrainingSelection } from "../model/trainingSelection";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { MIX_TRAINING_WORD_LIMIT } from "@/constants/training";
import { mixTrainingRepository } from "@/features/training/services/mixedWordSelection";
import { useSelectionStore } from "@/shared/selection/selectionStore";
import { useSessionUser } from "@/shared/session/useSession";
import { useVocabularyStore } from "@/shared/vocabulary/vocabularyStore";
import { logger } from "@/utils/logger";

const parseWordIds = (raw: string) =>
	[
		...new Set(
			raw
				.split(",")
				.map(Number)
				.filter((id) => Number.isInteger(id) && id > 0),
		),
	].slice(0, MIX_TRAINING_WORD_LIMIT);

type Preparation = {
	scope: string;
	status: "loading" | "ready" | "empty" | "error";
	error: unknown;
	readDuringSync?: boolean;
};

export function useMixedPreparation() {
	const { t } = useTranslation();
	const { wordIds } = useLocalSearchParams<{ wordIds?: string }>();
	const { user } = useSessionUser();
	const hasHydrated = useSelectionStore((state) => state._hasHydrated);
	const currentCatalogs = useSelectionStore((state) => state.currentCatalogs);
	const currentTopics = useSelectionStore((state) => state.currentTopics);
	const setChunkWordIds = useTrainingSelection(
		(state) => state.setChunkWordIds,
	);
	const lastSyncTime = useVocabularyStore((state) => state.lastSyncTime);
	const isSyncing = useVocabularyStore((state) => state.isSyncing);
	const [attempt, setAttempt] = useState(0);
	const scope = JSON.stringify({
		userId: user?.userId,
		learningLanguage: user?.language_learn,
		nativeLanguage: user?.language_speak,
		selectedCatalogIds: currentCatalogs,
		selectedTopicIds: currentTopics,
		wordIds,
	});
	const initialScope = useRef(scope);
	const currentScope = useRef(scope);
	currentScope.current = scope;
	const prepared = useRef<{ scope: string; ids: number[] } | null>(null);
	const [preparation, setPreparation] = useState<Preparation>({
		scope,
		status: "loading",
		error: null,
	});
	const canPrepare = Boolean(
		hasHydrated && user?.userId && user.language_learn && user.language_speak,
	);

	useEffect(() => {
		if (!canPrepare) return;
		// An established session keeps its original IDs across background sync.
		// Only an empty/error preparation is re-read when the first sync finishes.
		if (prepared.current?.scope === scope && prepared.current.ids.length > 0)
			return;
		let active = true;
		const isCurrent = () => active && currentScope.current === scope;
		const snapshot = JSON.parse(scope) as {
			userId: number;
			learningLanguage: string;
			nativeLanguage: string;
			selectedCatalogIds: number[];
			selectedTopicIds: number[];
			wordIds?: string;
		};
		const chunkIds = useTrainingSelection.getState().chunkWordIds;
		// A chunk supplied by intro is adopted only on initial preparation. A
		// later language/filter change must not reuse IDs from the old scope.
		if (
			!prepared.current &&
			scope === initialScope.current &&
			!snapshot.wordIds &&
			chunkIds?.length
		) {
			const ids = [...new Set(chunkIds)].slice(0, MIX_TRAINING_WORD_LIMIT);
			prepared.current = { scope, ids };
			if (ids.length !== chunkIds.length) setChunkWordIds(ids);
			setPreparation({ scope, status: "ready", error: null });
			return;
		}
		prepared.current = { scope, ids: [] };
		setPreparation({ scope, status: "loading", error: null });
		setChunkWordIds(null);
		// The attempt and sync version identify this read; cancellation prevents
		// older async results from publishing after a retry or completed sync.
		const requestVersion = { attempt, lastSyncTime };
		const selection = snapshot.wordIds
			? mixTrainingRepository.getDialogueWordIds({
					newWordIds: parseWordIds(snapshot.wordIds),
					userId: snapshot.userId,
					learningLanguage: snapshot.learningLanguage,
					nativeLanguage: snapshot.nativeLanguage,
					selectedCatalogIds: snapshot.selectedCatalogIds,
				})
			: mixTrainingRepository.getDefaultWordIds({
					learningLanguage: snapshot.learningLanguage,
					nativeLanguage: snapshot.nativeLanguage,
					selectedCatalogIds: snapshot.selectedCatalogIds,
					selectedTopicIds: snapshot.selectedTopicIds,
				});
		void selection
			.then((selectedIds) => {
				if (!isCurrent()) return;
				const ids = [...new Set(selectedIds)].slice(0, MIX_TRAINING_WORD_LIMIT);
				prepared.current = { scope, ids };
				setChunkWordIds(ids);
				setPreparation({
					scope,
					status: ids.length > 0 ? "ready" : "empty",
					error: null,
					readDuringSync: isSyncing,
				});
			})
			.catch((error) => {
				if (!isCurrent()) return;
				logger.error(
					"Failed to prepare mix training words",
					{ error, requestVersion },
					"db",
				);
				setPreparation({ scope, status: "error", error });
			});
		return () => {
			active = false;
		};
	}, [canPrepare, scope, setChunkWordIds, lastSyncTime, isSyncing, attempt]);

	const retry = useCallback(() => setAttempt((value) => value + 1), []);
	const current = canPrepare && preparation.scope === scope;
	return {
		t,
		ready:
			current &&
			preparation.status !== "loading" &&
			!(
				preparation.status === "empty" &&
				(isSyncing || preparation.readDuringSync)
			),
		hasWords: current && preparation.status === "ready",
		error: current ? preparation.error : null,
		retry,
	};
}
