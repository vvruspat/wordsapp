import { useCallback, useRef } from "react";
import { sessionOwner } from "@/shared/session/sessionOwner";
import { useOperationScope } from "@/shared/lifecycle/useOperationScope";
export function useAccountOperation() {
	const scope = useOperationScope("account-form");
	const pending = useRef(new Set<string>());
	return useCallback(
		(name: string) => {
			if (pending.current.has(name)) return null;
			pending.current.add(name);
			const generation = sessionOwner.getGeneration();
			const mounted = scope();
			return {
				mounted,
				current: () => mounted() && generation === sessionOwner.getGeneration(),
				finish: () => pending.current.delete(name),
			};
		},
		[scope],
	);
}
