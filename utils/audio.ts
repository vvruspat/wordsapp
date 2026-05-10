import * as FileSystem from "expo-file-system/legacy";

export const isRemoteAudioPath = (audio: string | null | undefined) =>
	Boolean(audio?.startsWith("http"));

export const resolveLocalAudioPath = (audio: string | null | undefined) => {
	if (!audio) {
		return null;
	}

	if (audio.startsWith("file://") || !audio.startsWith("http")) {
		return audio;
	}

	if (!FileSystem.documentDirectory) {
		return null;
	}

	const urlWithoutQuery = audio.split("?")[0];
	const filename = urlWithoutQuery.split("/").pop();

	if (!filename) {
		return null;
	}

	return `${FileSystem.documentDirectory}assets/audio/${filename}`;
};
