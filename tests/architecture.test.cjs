const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs"),
	os = require("node:os"),
	path = require("node:path"),
	{ spawnSync } = require("node:child_process");
function check(files) {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), "words-architecture-"));
	try {
		for (const [file, source] of Object.entries(files)) {
			const full = path.join(root, file);
			fs.mkdirSync(path.dirname(full), { recursive: true });
			fs.writeFileSync(full, source);
		}
		return spawnSync(
			process.execPath,
			[path.resolve("scripts/check-architecture.cjs"), root],
			{ encoding: "utf8" },
		);
	} finally {
		fs.rmSync(root, { recursive: true, force: true });
	}
}
test("architecture catches relative type reexports, cross-feature imports and cycles", () => {
	const result = check({
		"shared/a.ts": "export type {X} from '../features/account/x';",
		"features/account/x.ts": "export type X=string;",
		"features/training/x.ts":
			"import type {X} from '@/features/account/x'; export type Y=X;",
		"features/training/a.ts": "export * from './b';",
		"features/training/b.ts": "export * from './a';",
	});
	assert.equal(result.status, 1);
	assert.match(result.stderr, /upper layer/);
	assert.match(result.stderr, /another feature/);
	assert.match(result.stderr, /Cycle/);
});
test("architecture permits composition of independent features and shared modules", () => {
	const result = check({
		"composition/a.ts":
			"import {a} from '@/features/account/a';import {b} from '@/features/training/b';",
		"features/account/a.ts": "export const a=1;",
		"features/training/b.ts": "export const b=2;",
	});
	assert.equal(result.status, 0, result.stderr);
});
