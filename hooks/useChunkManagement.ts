import { useCallback, useEffect, useState } from "react";
import { userSettingsRepository } from "@/db/repositories/userSettings.repository";

const PROPOSAL_KEY_PREFIX = "daily_word_proposal";
export const CHUNK_SIZE = 5;

function getProposalKey(topicIds: number[], catalogIds: number[]): string {
	const ids = topicIds.length > 0 ? topicIds : catalogIds;
	return `${PROPOSAL_KEY_PREFIX}_${[...ids].sort().join("-")}`;
}

function isToday(isoString: string): boolean {
	return new Date(isoString).toDateString() === new Date().toDateString();
}

interface ChunkManagement {
	shouldShowProposal: boolean;
	loading: boolean;
	markProposed: () => Promise<void>;
}

export function useChunkManagement(
	userId: string | undefined,
	topicIds: number[],
	catalogIds: number[],
): ChunkManagement {
	const [lastProposedDate, setLastProposedDate] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);

	const key = getProposalKey(topicIds, catalogIds);

	useEffect(() => {
		if (!userId) {
			setLoading(false);
			return;
		}
		setLoading(true);
		userSettingsRepository
			.get(userId, key)
			.then((value) => setLastProposedDate(value))
			.finally(() => setLoading(false));
	}, [userId, key]);

	const shouldShowProposal =
		!loading && (!lastProposedDate || !isToday(lastProposedDate));

	const markProposed = useCallback(async () => {
		if (!userId) return;
		const now = new Date().toISOString();
		setLastProposedDate(now);
		await userSettingsRepository.set(userId, key, now);
	}, [userId, key]);

	return { shouldShowProposal, loading, markProposed };
}
