import { Q } from "@nozbe/watermelondb";
import { User as UserRemote } from "@repo/types";
import database from "../database";
import User from "../models/User";

const users = database.collections.get<User>("users");

export const usersRepository = {
	async create(userData: Partial<UserRemote>) {
		await database.write(async () => {
			await users.create((user) => {
				if (userData.id) {
					user.userId = userData.id;
				}
				if (userData.created_at) {
					user.remoteCreatedAt = userData.created_at;
				}
				if (userData.name) {
					user.name = userData.name;
				}
				if (userData.email) {
					user.email = userData.email;
				}
				if (userData.language_speak) {
					user.language_speak = userData.language_speak;
				}
				if (userData.email_verified !== undefined) {
					user.email_verified = userData.email_verified;
				}

				return user;
			});
		});
	},

	async update(userData: Partial<User>) {
		if (!userData.id) {
			throw new Error("User id is required for update.");
		}
		await database.write(async () => {
			const user = await users.find(userData.id as string);
			if (!user) {
				throw new Error(`User with id ${userData.id} not found.`);
			}
			await user.update((u) => {
				if (userData.name !== undefined) u.name = userData.name;
				if (userData.email !== undefined) u.email = userData.email;
				if (userData.language_speak !== undefined)
					u.language_speak = userData.language_speak;
				if (userData.language_learn !== undefined)
					u.language_learn = userData.language_learn;
				if (userData.email_verified !== undefined)
					u.email_verified = userData.email_verified;
			});
		});
	},

	async delete(id: string) {
		await database.write(async () => {
			const user = await users.find(id);
			if (user) {
				await user.markAsDeleted();
			}
		});
		return users.query().observe();
	},

	async getByUserId(userId: number): Promise<User | null> {
		const results = await database
			.get<User>("users")
			.query(Q.where("user_id", userId))
			.fetch();

		return results[0] || null;
	},

	async getByEmail(email: string): Promise<User | null> {
		const results = await database
			.get<User>("users")
			.query(Q.where("email", email))
			.fetch();

		return results[0] || null;
	},

	getAll(): Promise<User[]> {
		return database.get<User>("users").query().fetch();
	},
};
