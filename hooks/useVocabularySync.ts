import { useMemo } from "react";
import { useSessionUser } from "./useSession";
import { createVocabularyOperations } from "@/shared/vocabulary/vocabularyCoordinator";
export function useVocabularySync() {
	const { user } = useSessionUser();
	return useMemo(() => createVocabularyOperations(user), [user]);
}
