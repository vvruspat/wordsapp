import { useCallback, useEffect, useState } from "react";
import { File, Paths } from "expo-file-system";
import { useRouter } from "expo-router";
import { sessionOwner, sessionStore } from "@/shared/session/sessionOwner";
import { useExcerciseStore } from "@/hooks/useExcerciseStore";
import { useVocabularyStore } from "@/hooks/useVocabularyStore";
import { logger } from "@/utils/logger";

export function useBootstrap() {
	const [isReady, setIsReady] = useState(false);
	const [hasStoredSession, setHasStoredSession] = useState(false);
	const router = useRouter();

	const prepareStoredSession = useCallback(async () => {
		// On iOS, Keychain (SecureStore) persists across app uninstalls.
		// Detect a fresh install by checking a flag in the documents directory
		// (which is cleared on uninstall) and wipe any stale tokens.
		const flag = new File(Paths.document, "has_launched");
		if (!flag.exists) {
			flag.write("1");
			await sessionOwner.logout();
			setHasStoredSession(false);
			setIsReady(true);
			return;
		}

		await sessionOwner.restore();
		setHasStoredSession(Boolean(sessionStore.getState().accessToken));
		setIsReady(true);
	}, []);

	useEffect(() => {
		void prepareStoredSession().catch((error) => {
			logger.error("Unable to prepare stored session", error, "auth");
			setIsReady(true);
		});
	}, [prepareStoredSession]);

	const logout = useCallback(async () => {
		await sessionOwner.logout();
		useExcerciseStore.getState().reset();
		useVocabularyStore.getState().reset();
		setHasStoredSession(false);
		router.replace("/");
	}, [router]);

	return { isReady, hasStoredSession, logout };
}
