import { Model } from "@nozbe/watermelondb";
import { field } from "@nozbe/watermelondb/decorators";

export default class UserSetting extends Model {
	static table = "user_settings";

	@field("user_id")
	userId!: string;

	@field("setting_key")
	settingKey!: string;

	@field("setting_value")
	settingValue!: string;
}
