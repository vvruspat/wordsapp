import { Q } from "@nozbe/watermelondb";
import database from "../database";
import LearningProgress from "../models/LearningProgress";

export const REVISION_MONTHS = 3;

function revisionThreshold(): Date {
	const d = new Date();
	d.setMonth(d.getMonth() - REVISION_MONTHS);
	return d;
}

type RecordResultParams = {
	userId: number;
	wordId: number;
	scoreDelta: number;
	result: "success" | "failure";
	translationId?: number;
	trainingId?: number;
};

type UpsertFromRemoteParams = {
	userId: number;
	wordId: number;
	score: number;
	translationId?: number;
	trainingId?: number;
	remoteId?: number;
	createdAt?: string;
};

export const learningRepository = {
	async recordResult(params: RecordResultParams): Promise<LearningProgress | null> {
		const { userId, wordId, scoreDelta, result, translationId, trainingId } =
			params;
		const now = new Date().toISOString();

		const existing = await database
			.get<LearningProgress>("learning_progress")
			.query(Q.where("user_id", userId), Q.where("word_id", wordId))
			.fetch();

		if (result === "failure") {
			// On failure, delete the record so the word returns to the untrained pool
			if (existing.length > 0) {
				await database.write(async () => {
					await existing[0].destroyPermanently();
				});
			}
			return null;
		}

		// On success: update lastReview and score if record exists, otherwise create
		if (existing.length > 0) {
			const record = existing[0];
			await database.write(async () => {
				await record.update((r) => {
					r.score = Math.min(1, (r.score ?? 0) + scoreDelta);
					r.lastReview = now;
					if (translationId !== undefined) r.translation = translationId;
					if (trainingId !== undefined) r.training = trainingId;
				});
			});
			return record;
		}

		let created!: LearningProgress;
		await database.write(async () => {
			created = await database
				.get<LearningProgress>("learning_progress")
				.create((r) => {
					r.userId = userId;
					r.wordId = wordId;
					r.score = scoreDelta;
					r.lastReview = now;
					r.createdAtRemote = now;
					if (translationId !== undefined) r.translation = translationId;
					if (trainingId !== undefined) r.training = trainingId;
				});
		});
		return created;
	},

	async upsertFromRemote(
		params: UpsertFromRemoteParams,
	): Promise<LearningProgress> {
		const {
			userId,
			wordId,
			score,
			translationId,
			trainingId,
			remoteId,
			createdAt,
		} = params;
		const now = new Date().toISOString();

		const existing = await database
			.get<LearningProgress>("learning_progress")
			.query(Q.where("user_id", userId), Q.where("word_id", wordId))
			.fetch();

		if (existing.length > 0) {
			const record = existing[0];
			await database.write(async () => {
				await record.update((r) => {
					r.score = score;
					r.lastReview = now;
					if (translationId !== undefined) r.translation = translationId;
					if (trainingId !== undefined) r.training = trainingId;
					if (remoteId !== undefined) r.remoteId = remoteId;
				});
			});
			return record;
		}

		let created!: LearningProgress;
		await database.write(async () => {
			created = await database
				.get<LearningProgress>("learning_progress")
				.create((r) => {
					r.userId = userId;
					r.wordId = wordId;
					r.score = score;
					r.lastReview = now;
					r.createdAtRemote = createdAt ?? now;
					if (translationId !== undefined) r.translation = translationId;
					if (trainingId !== undefined) r.training = trainingId;
					if (remoteId !== undefined) r.remoteId = remoteId;
				});
		});
		return created;
	},

	async getUnsynced(): Promise<LearningProgress[]> {
		return database
			.get<LearningProgress>("learning_progress")
			.query(Q.where("remote_id", Q.eq(null)))
			.fetch();
	},

	async markSynced(localId: string, remoteId: number): Promise<void> {
		await database.write(async () => {
			const record = await database
				.get<LearningProgress>("learning_progress")
				.find(localId);
			await record.update((r) => {
				r.remoteId = remoteId;
			});
		});
	},

	async getByUser(userId: number): Promise<LearningProgress[]> {
		return database
			.get<LearningProgress>("learning_progress")
			.query(Q.where("user_id", userId))
			.fetch();
	},

	observeByUser(userId: number) {
		return database
			.get<LearningProgress>("learning_progress")
			.query(Q.where("user_id", userId))
			.observe();
	},

	async getTopicScores(
		userId: number,
		wordIds: number[],
	): Promise<{ greenScore: number; yellowScore: number; maxScore: number }> {
		if (wordIds.length === 0) {
			return { greenScore: 0, yellowScore: 0, maxScore: 0 };
		}

		const records = await database
			.get<LearningProgress>("learning_progress")
			.query(Q.where("user_id", userId), Q.where("word_id", Q.oneOf(wordIds)))
			.fetch();

		const threshold = revisionThreshold();
		let greenScore = 0;
		let yellowScore = 0;

		for (const record of records) {
			if (record.score > 0) {
				const lastReview = new Date(record.lastReview);
				if (lastReview >= threshold) {
					greenScore += record.score;
				} else {
					yellowScore += record.score;
				}
			}
		}

		return { greenScore, yellowScore, maxScore: wordIds.length };
	},
};
