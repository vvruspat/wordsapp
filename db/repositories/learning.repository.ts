import { Q } from "@nozbe/watermelondb";
import { logger } from "@/utils/logger";
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
	trainingId?: string;
};

type UpsertFromRemoteParams = {
	userId: number;
	wordId: number;
	score: number;
	translationId?: number;
	trainingId?: string;
	remoteId?: number;
	createdAt?: string;
};

export const learningRepository = {
	async recordResult(params: RecordResultParams): Promise<LearningProgress | null> {
		const { userId, wordId, scoreDelta, result, translationId, trainingId } =
			params;
		const now = new Date().toISOString();

		// Scope lookup to (user, word, training) when trainingId is available,
		// so each exercise maintains its own independent progress record.
		const existing = await database
			.get<LearningProgress>("learning_progress")
			.query(
				trainingId != null
					? Q.and(
							Q.where("user_id", userId),
							Q.where("word_id", wordId),
							Q.where("training", trainingId),
						)
					: Q.and(Q.where("user_id", userId), Q.where("word_id", wordId)),
			)
			.fetch();

		if (result === "failure") {
			if (existing.length > 0) {
				await database.write(async () => {
					await existing[0].update((r) => {
						r.score = 0;
						r.lastReview = now;
					});
				});
				logger.debug("learning_progress: reset to 0 (failure)", { userId, wordId, trainingId }, "db");
			} else {
				logger.debug("learning_progress: failure but no record to reset", { userId, wordId, trainingId }, "db");
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
			logger.debug("learning_progress: updated (success)", { userId, wordId, trainingId, newScore: Math.min(1, (existing[0].score ?? 0) + scoreDelta) }, "db");
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
		logger.debug("learning_progress: created (success)", { userId, wordId, trainingId, score: scoreDelta }, "db");
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
			.query(
				Q.where("user_id", userId),
				Q.where("word_id", wordId),
				...(trainingId != null ? [Q.where("training", trainingId)] : []),
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
			logger.debug("learning_progress: upserted from remote (update)", { userId, wordId, trainingId, score }, "db");
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
		logger.debug("learning_progress: upserted from remote (create)", { userId, wordId, trainingId, score }, "db");
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
		const records = await database
			.get<LearningProgress>("learning_progress")
			.query(Q.where("user_id", userId))
			.fetch();
		logger.debug("learning_progress: getByUser", { userId, count: records.length }, "db");
		return records;
	},

	async getByUserAndTraining(
		userId: number,
		trainingId: string,
	): Promise<LearningProgress[]> {
		const records = await database
			.get<LearningProgress>("learning_progress")
			.query(Q.where("user_id", userId), Q.where("training", trainingId))
			.fetch();
		logger.debug("learning_progress: getByUserAndTraining", { userId, trainingId, count: records.length }, "db");
		return records;
	},

	observeByUser(userId: number) {
		return database
			.get<LearningProgress>("learning_progress")
			.query(Q.where("user_id", userId))
			.observe();
	},

	async recordIntro(params: { userId: number; wordId: number; translationId?: number }): Promise<void> {
		const { userId, wordId, translationId } = params;
		const now = new Date().toISOString();

		const existing = await database
			.get<LearningProgress>("learning_progress")
			.query(
				Q.where("user_id", userId),
				Q.where("word_id", wordId),
				Q.where("training", "intro"),
			)
			.fetch();

		if (existing.length > 0) return;

		await database.write(async () => {
			await database
				.get<LearningProgress>("learning_progress")
				.create((r) => {
					r.userId = userId;
					r.wordId = wordId;
					r.score = 1;
					r.lastReview = now;
					r.createdAtRemote = now;
					r.training = "intro";
					if (translationId !== undefined) r.translation = translationId;
				});
		});
		logger.debug("learning_progress: intro recorded", { userId, wordId }, "db");
	},

	async getIntroducedWordIds(userId: number, wordIds: number[]): Promise<number[]> {
		if (wordIds.length === 0) return [];
		const records = await database
			.get<LearningProgress>("learning_progress")
			.query(
				Q.where("user_id", userId),
				Q.where("training", "intro"),
				Q.where("word_id", Q.oneOf(wordIds)),
			)
			.fetch();
		return records.map((r) => r.wordId);
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
