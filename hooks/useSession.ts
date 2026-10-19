import { useEffect } from "react";
import { useStore } from "zustand";
import { sessionOwner, sessionStore } from "@/shared/session/sessionOwner";
export function useSessionUser() {
	const session = useStore(sessionStore);
	useEffect(() => {
		void sessionOwner.restore();
	}, []);
	return { ...session, authUser: sessionOwner.authUser };
}
