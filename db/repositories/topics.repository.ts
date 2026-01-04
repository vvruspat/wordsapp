import { Q } from "@nozbe/watermelondb";
import { Topic as TopicRemote } from "@repo/types";
import database from "../database";
import Topic from "../models/Topic";

const topics = database.collections.get<Topic>("topics");

export const topicsRepository = {
	async create(topicData: Partial<TopicRemote & { language?: string }>) {
		await database.write(async () => {
			await topics.create((topic) => {
				if (topicData.id) {
					topic.remoteId = topicData.id;
				}
				if (topicData.created_at) {
					topic.remoteCreatedAt = topicData.created_at;
				}
				if (topicData.title) {
					topic.title = topicData.title;
				}
				if (topicData.description) {
					topic.description = topicData.description;
				}
				// Note: language is not in TopicRemote type but is required by Topic model
				// You may need to derive it from the catalog or provide it separately
				if ((topicData as { language?: string }).language) {
					topic.language = (topicData as { language?: string })
						.language as Topic["language"];
				}
				if (topicData.image !== undefined) {
					topic.image = topicData.image;
				}

				return topic;
			});
		});
	},

	async update(topicData: Partial<Topic>) {
		if (!topicData.id) {
			throw new Error("Topic id is required for update.");
		}
		await database.write(async () => {
			const topic = await topics.find(topicData.id as string);
			if (!topic) {
				throw new Error(`Topic with id ${topicData.id} not found.`);
			}
			await topic.update((t) => {
				if (topicData.title !== undefined) t.title = topicData.title;
				if (topicData.description !== undefined)
					t.description = topicData.description;
				if (topicData.language !== undefined)
					t.language = topicData.language;
				if (topicData.image !== undefined) t.image = topicData.image;
			});
		});
	},

	async delete(id: string) {
		await database.write(async () => {
			const topic = await topics.find(id);
			if (topic) {
				await topic.markAsDeleted();
			}
		});
		return topics.query().observe();
	},

	async getByRemoteId(remoteId: number): Promise<Topic | null> {
		const results = await database
			.get<Topic>("topics")
			.query(Q.where("remote_id", remoteId))
			.fetch();

		return results[0] || null;
	},

	async getByLanguage(language: string): Promise<Topic[]> {
		const results = await database
			.get<Topic>("topics")
			.query(Q.where("language", language))
			.fetch();

		return results;
	},

	getAll(): Promise<Topic[]> {
		return database.get<Topic>("topics").query().fetch();
	},
};

