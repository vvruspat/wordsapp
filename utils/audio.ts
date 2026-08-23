import * as FileSystem from "expo-file-system/legacy";

export const isRemoteAudioPath = (audio: string | null | undefined) =>
	Boolean(audio?.startsWith("http://") || audio?.startsWith("https://"));

export const resolveLocalAudioPath = (audio: string | null | undefined) => {
	if (!audio) {
		return null;
	}

	const urlWithoutQuery = audio.split("?")[0];

	if (!FileSystem.documentDirectory) {
		return isRemoteAudioPath(audio) ? null : urlWithoutQuery;
	}

	if (urlWithoutQuery.startsWith(FileSystem.documentDirectory)) {
		return urlWithoutQuery;
	}

	const filename = urlWithoutQuery.split("/").pop();

	if (!filename) {
		return null;
	}

	return `${FileSystem.documentDirectory}assets/audio/${filename}`;
};
