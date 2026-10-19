import { useCallback, useEffect, useRef } from "react";
/** Capture before awaiting; identity changes invalidate even before effect cleanup. */
export function useOperationScope(key: string) {
	const scope = useRef({ key, epoch: 0, mounted: true });
	if (scope.current.key !== key)
		scope.current = { key, epoch: scope.current.epoch + 1, mounted: true };
	useEffect(() => {
		scope.current.mounted = true;
		return () => {
			scope.current.mounted = false;
			scope.current.epoch++;
		};
	}, []);
	return useCallback(() => {
		const epoch = scope.current.epoch;
		return () =>
			scope.current.mounted &&
			scope.current.key === key &&
			scope.current.epoch === epoch;
	}, [key]);
}
