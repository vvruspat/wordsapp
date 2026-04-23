import * as SecureStore from "expo-secure-store";
import { createContext, useContext } from "react";

interface AuthContextType {
	triggerBiometricAuth: () => Promise<boolean>;
	resetBiometricsPreference: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
	triggerBiometricAuth: () => Promise.resolve(false),
	resetBiometricsPreference: () => Promise.resolve(),
});

export const useAuthContext = () => useContext(AuthContext);

export const resetBiometricsPreference = () =>
	SecureStore.deleteItemAsync("biometrics_skipped");
