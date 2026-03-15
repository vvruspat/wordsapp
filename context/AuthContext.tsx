import { createContext, useContext } from "react";

interface AuthContextType {
	triggerBiometricAuth: () => void;
}

export const AuthContext = createContext<AuthContextType>({
	triggerBiometricAuth: () => {},
});

export const useAuthContext = () => useContext(AuthContext);
