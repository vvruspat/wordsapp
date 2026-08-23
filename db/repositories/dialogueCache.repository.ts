import { Q } from "@nozbe/watermelondb";
import type { DialogueDetail, DialogueSession } from "@/api/dialogues";
import database from "../database";
import DialogueCache from "../models/DialogueCache";

const collection = database.collections.get<DialogueCache>("dialogue_cache");

const parse = (row: DialogueCache): DialogueDetail | null => {
	try {
		return JSON.parse(row.payload) as DialogueDetail;
	} catch {
		return null;
	}
};

const findRow = async (userId: number, sessionId: string) => {
	const rows = await collection
		.query(Q.where("user_id", userId), Q.where("session_id", sessionId))
		.fetch();
	return rows[0] ?? null;
};

export const dialogueCacheRepository = {
	async get(userId: number, sessionId: string) {
		const row = await findRow(userId, sessionId);
		return row ? parse(row) : null;
	},

	async list(userId: number) {
		const rows = await collection
			.query(Q.where("user_id", userId), Q.sortBy("updated_at", Q.desc))
			.fetch();
		return rows.map(parse).filter((item): item is DialogueDetail => Boolean(item));
	},

	async upsert(userId: number, detail: DialogueDetail) {
		await database.write(async () => {
			const row = await findRow(userId, detail.session.id);
			if (row) {
				await row.update((item) => {
					item.status = detail.session.status;
					item.title = detail.session.scenario_title;
					item.updatedAt = Date.parse(detail.session.updated_at);
					item.payload = JSON.stringify(detail);
				});
				return;
			}
			await collection.create((item) => {
				item.sessionId = detail.session.id;
				item.userId = userId;
				item.status = detail.session.status;
				item.title = detail.session.scenario_title;
				item.updatedAt = Date.parse(detail.session.updated_at);
				item.payload = JSON.stringify(detail);
				item.draft = "";
			});
		});
	},

	async mergeSessions(userId: number, sessions: DialogueSession[]) {
		for (const session of sessions) {
			const existing = await this.get(userId, session.id);
			await this.upsert(userId, {
				session,
				threads: existing?.threads ?? [],
				messages: existing?.messages ?? [],
				corrections: existing?.corrections ?? [],
			});
		}
	},

	async getDraft(userId: number, sessionId: string) {
		return (await findRow(userId, sessionId))?.draft ?? "";
	},

	async setDraft(userId: number, sessionId: string, draft: string) {
		await database.write(async () => {
			const row = await findRow(userId, sessionId);
			if (row) await row.update((item) => (item.draft = draft));
		});
	},

	async remove(userId: number, sessionId: string) {
		await database.write(async () => {
			const row = await findRow(userId, sessionId);
			if (row) await row.markAsDeleted();
		});
	},
};
