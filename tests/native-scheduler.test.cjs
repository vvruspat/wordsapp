const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { test } = require("node:test");

// Compile the production deferred-command methods against a recording delegate
// and a deterministic native queue. This checks callback delivery across teardown
// without a full Hermes/UIManager host or relying on freed memory to crash.
const root =
	process.env.WORDSAPP_SCHEDULER_SOURCE_DIR ??
	path.join(
		path.dirname(require.resolve("react-native/package.json")),
		"ReactCommon/react/renderer/scheduler",
	);
const source = fs.readFileSync(path.join(root, "Scheduler.cpp"), "utf8");
function method(signature) {
	const start = source.indexOf(signature);
	assert.notEqual(start, -1, `Missing native method ${signature}`);
	const open = source.indexOf("{", start);
	let depth = 0;
	for (let i = open; i < source.length; i++) {
		if (source[i] === "{") depth++;
		if (source[i] === "}" && --depth === 0) return source.slice(start, i + 1);
	}
	throw new Error(`Unclosed native method ${signature}`);
}
const destructor = method("Scheduler::~Scheduler()");
const invalidateOnDestruction =
	destructor.match(
		/delegateInvalidated_->store\(true, std::memory_order_release\);/,
	)?.[0] ?? "";

test("native Scheduler drops queued UI callbacks after detach, replacement and destruction without cancelling new work", () => {
	const directory = fs.mkdtempSync(
		path.join(os.tmpdir(), "wordsapp-scheduler-"),
	);
	const cpp = path.join(directory, "scheduler.cpp");
	const binary = path.join(directory, "scheduler-test");
	fs.writeFileSync(
		cpp,
		`
#include <atomic>
#include <functional>
#include <iostream>
#include <memory>
#include <stdexcept>
#include <string>
#include <utility>
#include <vector>
namespace folly { using dynamic = std::vector<int>; }
struct TraceSection { template <typename... T> TraceSection(T&&...) {} };
struct ShadowNode { int getSurfaceId() const { return 1; } };
struct ShadowView { explicit ShadowView(const ShadowNode&) {} };
struct MountingCoordinator { int getSurfaceId() const { return 1; } };
struct RuntimeScheduler {
 std::vector<std::function<void()>> pending;
 void scheduleRenderingUpdate(int, std::function<void()> callback) { pending.push_back(std::move(callback)); }
 void drain() { auto work = std::move(pending); pending.clear(); for (auto& callback : work) callback(); }
};
struct SchedulerDelegate {
 int commands = 0, renders = 0;
 void schedulerDidDispatchCommand(const ShadowView&, const std::string&, const folly::dynamic&) { commands++; }
 void schedulerDidFinishTransaction(const std::shared_ptr<const MountingCoordinator>&) {}
 void schedulerShouldRenderTransactions(const std::shared_ptr<const MountingCoordinator>&) { renders++; }
};
struct Scheduler {
 SchedulerDelegate* delegate_;
 RuntimeScheduler* runtimeScheduler_;
 std::shared_ptr<std::atomic<bool>> delegateInvalidated_ = std::make_shared<std::atomic<bool>>(false);
 Scheduler(RuntimeScheduler& runtime, SchedulerDelegate* delegate) : delegate_(delegate), runtimeScheduler_(&runtime) {}
 ~Scheduler();
 void setDelegate(SchedulerDelegate*);
 void uiManagerDidDispatchCommand(const std::shared_ptr<const ShadowNode>&, const std::string&, const folly::dynamic&);
 void uiManagerDidFinishTransaction(std::shared_ptr<const MountingCoordinator>, bool);
};
Scheduler::~Scheduler() { ${invalidateOnDestruction} }
${method("void Scheduler::setDelegate(")}
${method("void Scheduler::uiManagerDidDispatchCommand(")}
${method("void Scheduler::uiManagerDidFinishTransaction(")}
void require(bool condition, const char* message) { if (!condition) throw std::runtime_error(message); }
int main() {
 try {
  RuntimeScheduler runtime;
  SchedulerDelegate first, second;
  auto node = std::make_shared<ShadowNode>();
  auto transaction = std::make_shared<MountingCoordinator>();
  {
   Scheduler scheduler(runtime, &first);
   scheduler.uiManagerDidDispatchCommand(node, "scrollTo", {});
   scheduler.uiManagerDidFinishTransaction(transaction, false);
   scheduler.setDelegate(nullptr);
   runtime.drain();
   require(first.commands == 0 && first.renders == 0, "detached delegate received stale UI work");

   scheduler.setDelegate(&first);
   scheduler.uiManagerDidDispatchCommand(node, "focus", {});
   scheduler.setDelegate(&second);
   scheduler.uiManagerDidDispatchCommand(node, "scrollTo", {});
   scheduler.uiManagerDidFinishTransaction(transaction, false);
   runtime.drain();
   require(first.commands == 0, "replaced delegate received a stale command");
   require(second.commands == 1 && second.renders == 1, "new delegate work was cancelled");

   scheduler.uiManagerDidDispatchCommand(node, "blur", {});
   scheduler.setDelegate(&first);
   scheduler.setDelegate(&second);
   scheduler.uiManagerDidDispatchCommand(node, "focus", {});
   scheduler.setDelegate(&second);
   runtime.drain();
   require(second.commands == 2, "delegate reuse rearmed old callbacks or cancelled valid work");

   scheduler.uiManagerDidDispatchCommand(node, "scrollTo", {});
   scheduler.uiManagerDidFinishTransaction(transaction, false);
  }
  runtime.drain();
  require(second.commands == 2 && second.renders == 1, "destroyed scheduler delivered stale UI work");
  std::cout << "Native delegate lifetime cases passed\\n";
  return 0;
 } catch (const std::exception& error) { std::cerr << error.what() << '\\n'; return 1; }
}
`,
	);
	try {
		const compile = spawnSync(
			process.env.CXX ?? "c++",
			["-std=c++20", cpp, "-o", binary],
			{ encoding: "utf8" },
		);
		assert.equal(compile.status, 0, compile.stderr || String(compile.error));
		const run = spawnSync(binary, [], { encoding: "utf8" });
		assert.equal(run.status, 0, run.stderr || String(run.error));
	} finally {
		fs.rmSync(directory, { recursive: true, force: true });
	}
});
