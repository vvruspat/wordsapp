import type { ExerciseId } from "@/shared/progress/exercises";
export type Coverage = { wordId: number; training?: string; score: number };
export type SessionStatus =
	| "loading"
	| "ready"
	| "empty"
	| "completed"
	| "error";
/** Owns the immutable selection, remaining exercise pool and per-step delivery.
 * Word objects are owned by wordsService; this model knows only identifiers. */
export class TrainingSession {
	readonly wordIds: readonly number[];
	readonly trainingIds: readonly ExerciseId[];
	private coverage = new Set<string>();
	private delivered = new Set<string>();
	private order: number[] = [];
	private sequence = 0;
	private review = false;
	currentStep: { id: number; training: ExerciseId; wordIds: number[] } | null =
		null;
	status: SessionStatus;
	constructor(
		wordIds: number[],
		trainingIds: ExerciseId[],
		progress: Coverage[],
	) {
		this.wordIds = Object.freeze([...new Set(wordIds)]);
		this.trainingIds = Object.freeze([...new Set(trainingIds)]);
		this.status = wordIds.length ? "ready" : "empty";
		this.refresh(progress);
	}
	refresh(progress: Coverage[]) {
		if (this.review) return;
		this.coverage = new Set(
			progress
				.filter((item) => item.score > 0)
				.map((item) => `${item.wordId}:${item.training}`),
		);
		this.updateStatus();
	}
	remaining(ids: readonly ExerciseId[] = this.trainingIds) {
		return ids.filter((id) =>
			this.wordIds.some((word) => !this.coverage.has(`${word}:${id}`)),
		);
	}
	nextTraining(random = Math.random): ExerciseId | null {
		const pool = this.remaining();
		return (
			pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))] ??
			null
		);
	}
	select(training: ExerciseId, count: number) {
		// Matching and single-word exercises consume the same bounded selection.
		if (
			this.currentStep?.training === training &&
			this.currentStep.wordIds.some(
				(id) => !this.delivered.has(`${this.currentStep?.id}:${id}`),
			)
		)
			return this.currentStep;
		const unfinished = this.wordIds.filter(
			(id) => !this.coverage.has(`${id}:${training}`),
		);
		const candidates = [
			...unfinished,
			...this.wordIds.filter((id) => !unfinished.includes(id)),
		];
		candidates.sort(
			(a, b) => Number(this.order.includes(a)) - Number(this.order.includes(b)),
		);
		const selected = candidates.slice(0, count);
		this.order = selected;
		this.currentStep = { id: ++this.sequence, training, wordIds: selected };
		return this.currentStep;
	}
	canApply(step: number, wordId: number) {
		return (
			this.currentStep?.id === step &&
			this.currentStep.wordIds.includes(wordId) &&
			!this.delivered.has(`${step}:${wordId}`)
		);
	}
	apply(step: number, wordId: number, success: boolean) {
		if (!this.canApply(step, wordId) || !this.currentStep) return false;
		this.delivered.add(`${step}:${wordId}`);
		const key = `${wordId}:${this.currentStep.training}`;
		if (success) this.coverage.add(key);
		else this.coverage.delete(key);
		this.updateStatus();
		return true;
	}
	startReview(training: ExerciseId) {
		this.review = true;
		this.coverage = new Set();
		this.currentStep = null;
		this.order = [];
		this.reviewTraining = training;
		this.updateStatus();
	}
	private reviewTraining: ExerciseId | null = null;
	mastered(training: ExerciseId) {
		return this.wordIds.filter((id) => this.coverage.has(`${id}:${training}`))
			.length;
	}
	private updateStatus() {
		this.status =
			this.wordIds.length === 0
				? "empty"
				: this.remaining(
							this.reviewTraining ? [this.reviewTraining] : this.trainingIds,
						).length
					? "ready"
					: "completed";
	}
}
