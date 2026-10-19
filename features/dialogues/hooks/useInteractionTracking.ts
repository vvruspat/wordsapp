import { useCallback } from "react";
import { recordDialogueInteraction } from "../api/dialogues";
import { logger } from "@/utils/logger";
export function useInteractionTracking(sessionId: string) {
	return useCallback(
		(kind: "translation" | "hint") => {
			void recordDialogueInteraction(sessionId, kind).catch((error) =>
				logger.error("Unable to record dialogue interaction", error, "general"),
			);
		},
		[sessionId],
	);
}
