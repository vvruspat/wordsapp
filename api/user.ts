import { $fetch } from "@/utils/fetch";

export const updateUser = (body: {
	id?: number;
	name?: string;
	email?: string;
	language_speak?: string;
	language_learn?: string;
	email_verified: boolean;
}) => $fetch("/user", "put", { body });
