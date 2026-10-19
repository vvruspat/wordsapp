import { Q } from "@nozbe/watermelondb";
import type { components } from "@vvruspat/words-types";
import database from "@/db/database";
import User from "@/db/models/User";
export async function persistAuthenticatedUser(
	incomeUserData: components["schemas"]["UserDto"],
	isCurrent: () => boolean,
) {
	if (!isCurrent()) return;
	await database.write(async () => {
		if (!isCurrent()) return;
		const usersCollection = database.get<User>("users");
		const usersData = await usersCollection
			.query(Q.where("user_id", incomeUserData.id))
			.fetch();

		if (usersData[0]) {
			const userData = await usersCollection.find(usersData[0].id);
			await userData.update((u) => {
				u.name = incomeUserData.name;
				u.email = incomeUserData.email;
				if (incomeUserData.language_speak) {
					u.language_speak = incomeUserData.language_speak;
				}
				if (incomeUserData.language_learn) {
					u.language_learn = incomeUserData.language_learn;
				}
				if (incomeUserData.email_verified) {
					u.email_verified = incomeUserData.email_verified;
				}
				if (incomeUserData.onboarded !== undefined) {
					u.onboarded = incomeUserData.onboarded;
				}
				if (incomeUserData.created_at) {
					u.remoteCreatedAt = incomeUserData.created_at;
				}
			});
		} else {
			await usersCollection.create((u) => {
				u.userId = incomeUserData.id;
				u.name = incomeUserData.name;
				u.email = incomeUserData.email;
				u.language_speak = incomeUserData.language_speak ?? "en";

				if (incomeUserData.language_learn) {
					u.language_learn = incomeUserData.language_learn;
				}
				if (incomeUserData.email_verified) {
					u.email_verified = incomeUserData.email_verified;
				}
				u.onboarded = incomeUserData.onboarded ?? false;
				if (incomeUserData.created_at) {
					u.remoteCreatedAt = incomeUserData.created_at;
				}
			});
		}
	});
}
