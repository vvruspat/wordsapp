export const getBiggestWordLength = (sentence: string): number => {
	const words = sentence.split(" ");
	return Math.max(...words.map((word) => word.length));
};
