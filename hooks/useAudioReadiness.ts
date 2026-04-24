import { Q } from "@nozbe/watermelondb";
import { useDatabase } from "@nozbe/watermelondb/hooks";
import { useEffect, useState } from "react";
import Word from "@/db/models/Word";
import { isRemoteAudioPath } from "@/utils/audio";
import { useExcerciseStore } from "./useExcerciseStore";
import { useSessionUser } from "./useSession";

export const useAudioReadiness = () => {
	const database = useDatabase();
	const { user } = useSessionUser();
	const { currentCatalogs, currentTopics } = useExcerciseStore();
	const [state, setState] = useState({
		isAudioReady: false,
		pendingAudioCount: 0,
		totalWordCount: 0,
	});

	useEffect(() => {
		if (!user?.language_learn) {
			setState({
				isAudioReady: false,
				pendingAudioCount: 0,
				totalWordCount: 0,
			});
			return;
		}

		const queryConditions = [Q.where("language", user.language_learn)];

		if (currentCatalogs.length > 0) {
			queryConditions.push(Q.where("catalog", Q.oneOf(currentCatalogs)));
		}

		if (currentTopics.length > 0) {
			queryConditions.push(Q.where("topic", Q.oneOf(currentTopics)));
		}

		const subscription = database
			.get<Word>("words")
			.query(...queryConditions)
			.observe()
			.subscribe((words) => {
				const pendingAudioCount = words.filter((word) =>
					isRemoteAudioPath(word.audio),
				).length;

				setState({
					isAudioReady: words.length > 0 && pendingAudioCount === 0,
					pendingAudioCount,
					totalWordCount: words.length,
				});
			});

		return () => {
			subscription.unsubscribe();
		};
	}, [currentCatalogs, currentTopics, database, user?.language_learn]);

	return state;
};
