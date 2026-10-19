export function evaluateTypedAnswer(
	input: string,
	primary: string,
	alternatives: string[],
	includePrimary = true,
): "default" | "success" | "error" {
	const target = primary.trim().toLowerCase(),
		value = input.trim().toLowerCase();
	const answers = [
		...new Set([
			...(includePrimary ? [target] : []),
			...alternatives.map((word) => word.trim().toLowerCase()),
		]),
	].filter((word) => word.length === target.length);
	if (value.length === target.length)
		return answers.includes(value) ? "success" : "error";
	return answers.some((word) => word.startsWith(value)) ? "default" : "error";
}
export function isAcceptedTranslation(
	input: string,
	primary: string,
	alternatives: string[],
) {
	return alternatives.length > 0
		? alternatives.includes(input)
		: input === primary;
}
