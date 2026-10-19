import { useMemo } from "react";
import { useSessionUser } from "@/shared/session/useSession";
import { createVocabularyOperations } from "@/shared/vocabulary/vocabularyCoordinator";
export function useVocabularySync() {
	const { user } = useSessionUser();
	const userId = user?.userId,
		language_learn = user?.language_learn,
		language_speak = user?.language_speak;
	return useMemo(
		() =>
			createVocabularyOperations(
				userId && language_learn && language_speak
					? { userId, language_learn, language_speak }
					: null,
			),
		[userId, language_learn, language_speak],
	);
}
