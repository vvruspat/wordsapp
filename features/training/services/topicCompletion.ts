import { learningRepository } from "@/db/repositories/learning.repository";
import { topicsRepository } from "@/db/repositories/topics.repository";
import { wordsRepository } from "@/db/repositories/words.repository";
import { buildTopicProgressStats } from "@/utils/topicProgress";

export async function readTopicCompletion(
	userId: number | undefined,
	learningLanguage: string | undefined,
	currentCatalogs: number[],
	currentTopics: number[],
	selectedTopicId: number | null,
) {
	if (
		!userId ||
		!learningLanguage ||
		currentCatalogs.length === 0 ||
		selectedTopicId == null
	) {
		return {
			isComplete: false,
			nextTopicId: null,
			nextTopicTitle: null,
		};
	}

	const [topics, words, progressRecords, availableTopicIds] = await Promise.all(
		[
			topicsRepository.getByLanguage(learningLanguage),
			wordsRepository.getByTopicIds(currentTopics, currentCatalogs),
			learningRepository.getByUser(userId),
			wordsRepository.getTopicsByCatalogs(currentCatalogs),
		],
	);

	const sortedTopics = topics.sort((a, b) => a.title.localeCompare(b.title));
	const filteredTopics = sortedTopics.filter((topic) =>
		availableTopicIds.has(topic.remoteId),
	);
	const currentTopicIndex = filteredTopics.findIndex(
		(topic) => topic.remoteId === selectedTopicId,
	);
	const nextTopic =
		currentTopicIndex >= 0 ? filteredTopics[currentTopicIndex + 1] : null;
	const stats = buildTopicProgressStats(words, progressRecords);
	const topicStats = stats.get(selectedTopicId);

	return {
		isComplete: Boolean(
			topicStats &&
				topicStats.total > 0 &&
				topicStats.learned >= topicStats.total,
		),
		nextTopicId: nextTopic?.remoteId ?? null,
		nextTopicTitle: nextTopic?.title ?? null,
	};
}
