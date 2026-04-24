import { createContext, useContext } from "react";

interface AuthContextType {
	logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
	logout: () => Promise.resolve(),
});

export const useAuthContext = () => useContext(AuthContext);
