import { updateUser } from "@/api/user";
import database from "@/db/database";
import type User from "@/db/models/User";
import { sessionOwner } from "@/shared/session/sessionOwner";
export async function saveAccount(
	user: User | null,
	body: Parameters<typeof updateUser>[0],
) {
	const generation = sessionOwner.getGeneration();
	const current = () => generation === sessionOwner.getGeneration();
	const response = await updateUser(body);
	if (!current()) throw new Error("Session changed while saving profile");
	if (response.status === "error" || !user) return response;
	await database.write(async () => {
		if (!current()) throw new Error("Session changed while saving profile");
		await user.update((record) => {
			if (body.name !== undefined) record.name = body.name;
			if (body.email !== undefined) record.email = body.email;
			if (body.language_speak !== undefined)
				record.language_speak = body.language_speak;
			if (body.language_learn !== undefined)
				record.language_learn = body.language_learn;
			record.onboarded = body.onboarded;
		});
	});
	return response;
}
