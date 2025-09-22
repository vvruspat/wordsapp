import { useDatabase } from "@nozbe/watermelondb/hooks";
import { useEffect, useState } from "react";
import User from "@/models/User";

export const useSessionUser = () => {
	const database = useDatabase();
	const [user, setUser] = useState<User[] | null>(null);

	useEffect(() => {
		const progressCollection = database.get<User>("users");

		const subscription = progressCollection
			.query()
			.observe()
			.subscribe(setUser);

		return () => subscription.unsubscribe();
	}, [database]);

	return user?.[0] ?? null;
};
