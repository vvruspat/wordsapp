import { Q } from "@nozbe/watermelondb";
import database from "../database";
import LearningProgress from "../models/LearningProgress";

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
	async recordResult(params: RecordResultParams): Promise<LearningProgress> {
		const { userId, wordId, scoreDelta, result, translationId, trainingId } = params;
		const now = new Date().toISOString();

		const existing = await database
			.get<LearningProgress>("learning_progress")
			.query(
				Q.where("user_id", userId),
				Q.where("word_id", wordId),
			)
			.fetch();

		if (existing.length > 0) {
			const record = existing[0];
			await database.write(async () => {
				await record.update((r) => {
					const current = r.score ?? 0;
					if (result === "success") {
						r.score = Math.min(1, current + scoreDelta);
					} else {
						r.score = Math.max(0, current - scoreDelta);
					}
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
					r.score = result === "success" ? scoreDelta : 0;
					r.lastReview = now;
					r.createdAtRemote = now;
					if (translationId !== undefined) r.translation = translationId;
					if (trainingId !== undefined) r.training = trainingId;
				});
		});
		return created;
	},

	async upsertFromRemote(params: UpsertFromRemoteParams): Promise<LearningProgress> {
		const { userId, wordId, score, translationId, trainingId, remoteId, createdAt } = params;
		const now = new Date().toISOString();

		const existing = await database
			.get<LearningProgress>("learning_progress")
			.query(
				Q.where("user_id", userId),
				Q.where("word_id", wordId),
			)
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
};
