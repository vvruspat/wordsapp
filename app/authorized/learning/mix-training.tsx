import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { TrainingAppWrapper } from "@/components/TrainingAppWrapper";
import { useExcerciseStore } from "@/hooks/useExcerciseStore";

function parseWordIds(raw: string | string[] | undefined): number[] {
	const value = Array.isArray(raw) ? raw[0] : raw;
	if (!value) return [];
	return value
		.split(",")
		.map(Number)
		.filter((id) => Number.isFinite(id));
}

export default function MixTraining() {
	const { wordIds } = useLocalSearchParams<{ wordIds?: string | string[] }>();
	const { setChunkWordIds } = useExcerciseStore();
	const [isScopeReady, setIsScopeReady] = useState(false);
	const scopedWordIds = useMemo(() => parseWordIds(wordIds), [wordIds]);

	useEffect(() => {
		setChunkWordIds(scopedWordIds.length > 0 ? scopedWordIds : null);
		setIsScopeReady(true);

		return () => {
			setChunkWordIds(null);
		};
	}, [scopedWordIds, setChunkWordIds]);

	if (!isScopeReady) {
		return null;
	}

	return <TrainingAppWrapper excludedExercises={["cards"]} />;
}
