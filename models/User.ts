import { Model } from "@nozbe/watermelondb";
import { field } from "@nozbe/watermelondb/decorators";
import { User as IUser } from "@repo/types";

export default class User extends Model implements Omit<IUser, "id"> {
	static table = "users";

	@field("user_id")
	userId!: number;

	@field("name")
	name!: string;

	@field("email")
	email!: string;

	@field("remote_created_at")
	remoteCreatedAt!: string;

	@field("language_speak")
	language_speak!: string;

	@field("language_learn")
	language_learn!: string;

	@field("email_verified")
	email_verified?: boolean;

	// Computed property to satisfy interface requirement
	get created_at(): string {
		return this.remoteCreatedAt;
	}
}
