export interface Learning {
	id: number;
	created_at: string; // timestamp with time zone
	user: number;
	word: number;
	score: number;
	last_review: string; // timestamp without time zone
	training: number;
	translation: number;
}

export interface LearningData extends Learning {
	wordData: WordData;
	trainingData: Training;
	translationData: WordTranslation;
}

export interface Topic {
	id: number;
	created_at: string;
	title: string;
	description: string;
	catalog: number;
	image?: string | null;
}

export interface Training {
	id: number;
	created_at: string;
	name: string;
	title: string;
	description: string;
	image: string;
	score: number;
}

export interface User {
	id: number;
	created_at: string;
	email: string;
	name?: string;
	password?: string;
	language_speak: string;
	email_verified?: boolean;
}

export interface VocabCatalog {
	id: number;
	created_at: string;
	owner: number;
	title: string;
	description?: string | null;
	language: string;
	image?: string | null;
}

export interface Word {
	id: number;
	created_at: string;
	topic: number;
	catalog: number;
	language: string;
	audio: string;
	transcribtion: string;
	meaning?: string;
}

export interface WordData extends Word {
	topicData: Topic;
	catalogData: VocabCatalog;
}

export interface WordTranslation {
	id: number;
	created_at: string;
	word: number;
	translation: string;
	language: string;
}
