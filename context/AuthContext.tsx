import { createContext, useContext } from "react";

interface AuthContextType {
	triggerBiometricAuth: () => Promise<boolean>;
}

export const AuthContext = createContext<AuthContextType>({
	triggerBiometricAuth: () => Promise.resolve(false),
});

export const useAuthContext = () => useContext(AuthContext);
