export type VocabularyResult = {
	source: "click" | "native_insert" | "correction" | "manual";
	item: {
		id: string;
		word: number;
		source: "click" | "native_insert" | "correction" | "manual";
	};
	word: {
		id: number;
		created_at: string;
		word: string;
		topic: number;
		catalog: number;
		language: string;
		meaning?: string;
		audio?: string;
		transcription: string;
		status: string;
	};
	translation: {
		id: number;
		created_at: string;
		word: number;
		translation: string;
		language: string;
	};
	progress: {
		intro: DialogueLearningProgress;
		writing: DialogueLearningProgress | null;
	};
	isNew: boolean;
};

export type DialogueLearningProgress = {
	id: number;
	created_at: string;
	last_review: string;
	word: number;
	translation: number;
	training: string;
	score: number;
};
