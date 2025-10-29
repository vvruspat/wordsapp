import { createContext, ReactNode, useState } from "react";

type ResultModalType = {
	successModalVisible: boolean;
	failureModalVisible: boolean;
	setSuccessModalVisible: (visible: boolean) => void;
	setFailureModalVisible: (visible: boolean) => void;
};

const ResultModalContext = createContext<ResultModalType>({
	setSuccessModalVisible: () => {},
	setFailureModalVisible: () => {},
	successModalVisible: false,
	failureModalVisible: false,
});

export { ResultModalContext };
type ResultModalProviderProps = { children?: ReactNode };

type ResultModalValue = ResultModalType;

export const ResultModalProvider = ({ children }: ResultModalProviderProps) => {
	const [successModalVisible, setSuccessModalVisible] = useState(false);
	const [failureModalVisible, setFailureModalVisible] = useState(false);

	const value: ResultModalValue = {
		setSuccessModalVisible,
		setFailureModalVisible,
		successModalVisible,
		failureModalVisible,
	};

	return (
		<ResultModalContext.Provider value={value}>
			{children}
		</ResultModalContext.Provider>
	);
};
