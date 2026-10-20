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
	private listeners = new Set<() => void>();
	private revision = 0;
	subscribe = (listener: () => void) => {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	};
	getRevision = () => this.revision;
	getState = () => ({
		wordIds: this.wordIds,
		remainingTrainingIds: this.remaining(),
		currentStep: this.currentStep,
		status: this.status,
	});
	private publish() {
		this.revision++;
		for (const listener of this.listeners) listener();
	}

	readonly wordIds: readonly number[];
	trainingIds: readonly ExerciseId[];
	private coverage = new Set<string>();
	private durableCoverage = new Set<string>();
	private delivered = new Set<string>();
	private wordQueues = new Map<ExerciseId, number[]>();
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
		this.durableCoverage = new Set(
			progress
				.filter((item) => item.score > 0)
				.map((item) => `${item.wordId}:${item.training}`),
		);
		if (this.review) return;
		this.coverage = new Set(this.durableCoverage);
		this.updateStatus();
	}
	remaining(ids: readonly ExerciseId[] = this.trainingIds) {
		return ids.filter(
			(id) =>
				(!this.reviewTraining || id === this.reviewTraining) &&
				this.wordIds.some((word) => !this.coverage.has(`${word}:${id}`)),
		);
	}
	configureTrainings(ids: ExerciseId[]) {
		if (
			this.reviewTraining &&
			(ids.length !== 1 || ids[0] !== this.reviewTraining)
		) {
			this.review = false;
			this.reviewTraining = null;
			this.coverage = new Set(this.durableCoverage);
			this.currentStep = null;
			this.wordQueues.clear();
		}
		this.trainingIds = Object.freeze([...new Set(ids)]);
		this.updateStatus();
	}
	nextTraining(random = Math.random): ExerciseId | null {
		const pool = this.remaining();
		return (
			pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))] ??
			null
		);
	}
	select(training: ExerciseId, count: number) {
		if (this.reviewTraining && training !== this.reviewTraining) {
			throw new Error("Select the next exercise before leaving a review pass");
		}
		// Matching and single-word exercises consume the same bounded selection.
		if (
			this.currentStep?.training === training &&
			this.currentStep.wordIds.some(
				(id) => !this.delivered.has(`${this.currentStep?.id}:${id}`),
			)
		)
			return this.currentStep;
		const queue = this.wordQueues.get(training) ?? [...this.wordIds];
		this.wordQueues.set(training, queue);
		const unfinished = queue.filter(
			(id) => !this.coverage.has(`${id}:${training}`),
		);
		const candidates = [
			...unfinished,
			...queue.filter((id) => this.coverage.has(`${id}:${training}`)),
		];
		const selected = candidates.slice(0, count);
		this.currentStep = { id: ++this.sequence, training, wordIds: selected };
		this.publish();
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
		// A delivered word waits behind all unserved words of this exercise.
		// Keep this order across mixed exercise switches and progress refreshes.
		const training = this.currentStep.training;
		const queue = this.wordQueues.get(training) ?? [...this.wordIds];
		this.wordQueues.set(training, [
			...queue.filter((id) => id !== wordId),
			wordId,
		]);
		const key = `${wordId}:${this.currentStep.training}`;
		if (success) {
			this.coverage.add(key);
			this.durableCoverage.add(key);
		} else {
			this.coverage.delete(key);
			this.durableCoverage.delete(key);
		}
		this.updateStatus();
		return true;
	}
	startReview(training: ExerciseId) {
		this.review = true;
		this.coverage = new Set();
		this.currentStep = null;
		this.wordQueues.clear();
		this.reviewTraining = training;
		this.updateStatus();
	}
	private reviewTraining: ExerciseId | null = null;
	hasMastered(wordId: number, training: ExerciseId) {
		return this.coverage.has(`${wordId}:${training}`);
	}
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
		this.publish();
	}
}
