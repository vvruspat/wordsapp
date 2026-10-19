import { useEffect, useState } from "react";
import * as FileSystem from "expo-file-system/legacy";
import { useVocabularyStore } from "@/hooks/useVocabularyStore";
import { isRemoteAudioPath, resolveLocalAudioPath } from "@/utils/audio";
export function useAudioSource(audio: string | null | undefined) {
	const [audioSource, setAudioSource] = useState<string | null>(null);
	const audioDownloadCompleted = useVocabularyStore(
		(state) => state.audioDownloadCompleted,
	);
	const localAudioPath = resolveLocalAudioPath(audio);
	const remoteAudioSource = isRemoteAudioPath(audio) ? (audio ?? null) : null;
	// biome-ignore lint/correctness/useExhaustiveDependencies: audioDownloadCompleted is a refresh trigger for local file availability.
	useEffect(() => {
		let cancelled = false;

		if (!localAudioPath) {
			setAudioSource(remoteAudioSource);
			return;
		}

		FileSystem.getInfoAsync(localAudioPath)
			.then((fileInfo) => {
				if (!cancelled) {
					setAudioSource(fileInfo.exists ? localAudioPath : remoteAudioSource);
				}
			})
			.catch(() => {
				if (!cancelled) {
					setAudioSource(remoteAudioSource);
				}
			});

		return () => {
			cancelled = true;
		};
	}, [localAudioPath, remoteAudioSource, audioDownloadCompleted]);

	return {
		audioSource,
		available: Boolean(localAudioPath || remoteAudioSource),
	};
}
