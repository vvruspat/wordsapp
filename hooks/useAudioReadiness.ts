import { Q } from "@nozbe/watermelondb";
import { useDatabase } from "@nozbe/watermelondb/hooks";
import { useEffect, useState } from "react";
import Word from "@/db/models/Word";
import { isRemoteAudioPath } from "@/utils/audio";
import { useSessionUser } from "./useSession";

export const useAudioReadiness = () => {
	const database = useDatabase();
	const { user } = useSessionUser();
	const [state, setState] = useState({
		isAudioReady: false,
		isAudioReadinessLoading: true,
		pendingAudioCount: 0,
		totalWordCount: 0,
	});

	useEffect(() => {
		if (!user?.language_learn) {
			setState({
				isAudioReady: false,
				isAudioReadinessLoading: false,
				pendingAudioCount: 0,
				totalWordCount: 0,
			});
			return;
		}

		const queryConditions = [Q.where("language", user.language_learn)];
		setState((prev) => ({ ...prev, isAudioReadinessLoading: true }));

		const subscription = database
			.get<Word>("words")
			.query(...queryConditions)
			.observeWithColumns(["audio"])
			.subscribe((words) => {
				const pendingAudioCount = words.filter((word) =>
					isRemoteAudioPath(word.audio),
				).length;

				setState({
					isAudioReady: words.length > 0 && pendingAudioCount === 0,
					isAudioReadinessLoading: false,
					pendingAudioCount,
					totalWordCount: words.length,
				});
			});

		return () => {
			subscription.unsubscribe();
		};
	}, [database, user?.language_learn]);

	return state;
};
