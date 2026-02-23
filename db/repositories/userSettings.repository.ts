import { Q } from "@nozbe/watermelondb";
import database from "../database";
import UserSetting from "../models/UserSetting";

const userProfile = database.collections.get<UserSetting>("user_profile");

export const userSettingsRepository = {
	async get(userId: string, key: string): Promise<string | null> {
		const results = await userProfile
			.query(Q.where("user_id", userId), Q.where("setting_key", key))
			.fetch();
		return results[0]?.settingValue ?? null;
	},

	async set(userId: string, key: string, value: string): Promise<void> {
		await database.write(async () => {
			const existing = await userProfile
				.query(Q.where("user_id", userId), Q.where("setting_key", key))
				.fetch();
			if (existing.length > 0) {
				await existing[0].update((s) => {
					s.settingValue = value;
				});
			} else {
				await userProfile.create((s) => {
					s.userId = userId;
					s.settingKey = key;
					s.settingValue = value;
				});
			}
		});
	},
};
