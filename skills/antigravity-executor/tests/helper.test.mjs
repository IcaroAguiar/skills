import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdtempSync } from "node:fs";
import test from "node:test";

const skillRoot = new URL("../", import.meta.url).pathname;
const helper = join(skillRoot, "scripts", "antigravity-executor.mjs");

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "antigravity-executor-test-"));
  const mockBin = join(root, "mock-bin");
  const configRoot = join(root, ".gemini", "config");
  const binDir = join(root, "bin");
  const core = join(root, "AGENTS.md");
  mkdirSync(mockBin, { recursive: true });
  mkdirSync(configRoot, { recursive: true });
  writeFileSync(core, "# Test core\n");
  writeFileSync(join(configRoot, "config.json"), "{}\n");
  const agy = join(mockBin, "agy");
  writeFileSync(
    agy,
    `#!/usr/bin/env node
const args = process.argv.slice(2);
if (args.includes('--version')) process.stdout.write('1.1.13\\n');
else if (args.includes('update')) process.stdout.write('updated\\n');
else if (args.includes('models')) process.stdout.write(JSON.stringify([{id:'gemini-3.7-flash-high'}]));
else if (args.includes('agents')) process.stdout.write(JSON.stringify({command:{data:{agents:['antigravity-executor']}}}));
else if (args.includes('/quota')) process.stdout.write(JSON.stringify({command:{data:{groups:[{name:'Gemini Models',buckets:[{id:'gemini-weekly',remaining_fraction:0.9},{id:'gemini-5h',remaining_fraction:0.8}]}]}}}));
else {
  if (process.env.MOCK_ROGUE === '1') require('fs').writeFileSync('rogue.txt', 'rogue\\n');
  if (process.env.MOCK_IGNORED === '1') require('fs').writeFileSync('.env', 'changed\\n');
  if (process.env.MOCK_SLEEP_MS) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, Number(process.env.MOCK_SLEEP_MS));
  const pushStatus = process.env.MOCK_PUSH === '1' ? require('child_process').spawnSync('git',['push']).status : null;
  const receipt = {status:'RETURN_TO_CONTROLLER',package_id:process.env.MOCK_PACKAGE_ID,cause:pushStatus === null ? 'fixture' : 'push-status=' + pushStatus,correction:'fixture',implementation_anchor:'fixture.txt',diff:['fixture.txt'],checks:[{command:'test',result:'pass'}],git:{branch:process.env.MOCK_BRANCH,head:process.env.MOCK_HEAD,clean:true,published:false,pr:null},pending_proof:[],residual_risk:[],next_action:'audit'};
  process.stdout.write(JSON.stringify({conversation_id:'fixture-conversation',model:'gemini-3.7-flash-high',response:JSON.stringify(receipt),usage:{input_tokens:10,output_tokens:5,total_tokens:15}}));
}
`,
  );
  chmodSync(agy, 0o755);
  const env = {
    ...process.env,
    PATH: `${mockBin}:${process.env.PATH}`,
    ANTIGRAVITY_EXECUTOR_CONFIG_ROOT: configRoot,
    ANTIGRAVITY_EXECUTOR_CORE: core,
    ANTIGRAVITY_EXECUTOR_BIN_DIR: binDir,
  };
  return { root, configRoot, binDir, core, env };
}

function run(args, options = {}) {
  const result = spawnSync(process.execPath, [helper, ...args, "--json"], { encoding: "utf8", ...options });
  if (result.status !== 0) {
    throw new Error(`helper failed (${result.status}): ${result.stdout}\n${result.stderr}`);
  }
  return JSON.parse(result.stdout);
}

function createRepo(root) {
  const repo = join(root, "fixture-repo");
  mkdirSync(repo);
  execFileSync("git", ["init", "-b", "feature/fixture"], { cwd: repo });
  execFileSync("git", ["config", "user.email", "fixture@example.invalid"], { cwd: repo });
  execFileSync("git", ["config", "user.name", "Fixture"], { cwd: repo });
  writeFileSync(join(repo, "fixture.txt"), "fixture\n");
  execFileSync("git", ["add", "fixture.txt"], { cwd: repo });
  execFileSync("git", ["commit", "-m", "fixture"], { cwd: repo });
  const head = execFileSync("git", ["rev-parse", "HEAD"], { cwd: repo, encoding: "utf8" }).trim();
  return { repo, head };
}

function writePacket(root, repo, head) {
  const packetPath = join(root, "dispatch.json");
  writeFileSync(packetPath, JSON.stringify({
    package_id: "fixture-package",
    objective: "Prove the helper lifecycle",
    allowed_paths: ["fixture.txt"],
    non_goals: ["No remote writes"],
    repository: repo,
    base: { sha: head, topology: "independent", branch: "feature/fixture" },
    route: { model: "gemini-3.7-flash-high", reason: "fixture" },
    checks: ["test"],
    git_authority: { commit: false, push: false, pr: false },
  }));
  return packetPath;
}

test("setup installs live core, agent and helper links; doctor is ready", () => {
  const state = fixture();
  const setup = run(["setup"], { env: state.env });
  assert.equal(setup.ok, true);
  assert.equal(realpathSync(join(state.root, ".gemini", "GEMINI.md")), realpathSync(state.core));
  assert.equal(realpathSync(join(state.configRoot, "agents", "antigravity-executor", "agent.md")), realpathSync(join(skillRoot, "assets", "agent.md")));
  assert.equal(realpathSync(join(state.binDir, "antigravity-executor")), realpathSync(helper));
  const doctor = run(["doctor"], { env: state.env, cwd: state.root });
  assert.equal(doctor.data.ready, true);
  assert.deepEqual(doctor.data.failures, []);
});

test("dry-run validates Git package without invoking a model", () => {
  const state = fixture();
  run(["setup"], { env: state.env });
  const { repo, head } = createRepo(state.root);
  const packet = writePacket(state.root, repo, head);
  const result = run(["run", "--packet", packet, "--receipt", join(state.root, "receipt.json"), "--cwd", repo, "--dry-run"], { env: state.env, cwd: repo });
  assert.equal(result.data.dry_run, true);
  assert.equal(result.data.model, "gemini-3.7-flash-high");
  assert.ok(result.data.invocation.includes("--dangerously-skip-permissions"));
  assert.equal(result.data.invocation.includes("--agent"), false);
});

test("run writes and verify-receipt validates a compact envelope", () => {
  const state = fixture();
  run(["setup"], { env: state.env });
  const { repo, head } = createRepo(state.root);
  const packet = writePacket(state.root, repo, head);
  const receipt = join(state.root, "receipt.json");
  const env = { ...state.env, MOCK_PACKAGE_ID: "fixture-package", MOCK_BRANCH: "feature/fixture", MOCK_HEAD: head };
  const result = run(["run", "--packet", packet, "--receipt", receipt, "--cwd", repo], { env, cwd: repo });
  assert.equal(result.data.envelope.conversation_id, "fixture-conversation");
  assert.equal(result.data.envelope.executor.status, "RETURN_TO_CONTROLLER");
  assert.deepEqual(result.data.envelope.changed_paths, []);
  assert.equal(JSON.parse(readFileSync(receipt, "utf8")).usage.total_tokens, 15);
  const verified = run(["verify-receipt", receipt], { env, cwd: repo });
  assert.deepEqual(verified.data, { valid: true, package_id: "fixture-package", status: "RETURN_TO_CONTROLLER" });
});

test("run rejects changes outside allowed paths and preserves them for audit", () => {
  const state = fixture();
  run(["setup"], { env: state.env });
  const { repo, head } = createRepo(state.root);
  const packet = writePacket(state.root, repo, head);
  const env = { ...state.env, MOCK_PACKAGE_ID: "fixture-package", MOCK_BRANCH: "feature/fixture", MOCK_HEAD: head, MOCK_ROGUE: "1" };
  const result = spawnSync(process.execPath, [helper, "run", "--packet", packet, "--receipt", join(state.root, "receipt.json"), "--cwd", repo, "--json"], { encoding: "utf8", env, cwd: repo });
  assert.equal(result.status, 5);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.error.code, "EXECUTION_BOUNDARY_VIOLATION");
  assert.match(payload.error.details.join("\n"), /rogue\.txt/);
  assert.equal(readFileSync(join(repo, "rogue.txt"), "utf8"), "rogue\n");
});

test("run detects ignored-file changes outside allowed paths", () => {
  const state = fixture();
  run(["setup"], { env: state.env });
  const { repo } = createRepo(state.root);
  writeFileSync(join(repo, ".gitignore"), ".env\n");
  execFileSync("git", ["add", ".gitignore"], { cwd: repo });
  execFileSync("git", ["commit", "-m", "ignore env"], { cwd: repo });
  const head = execFileSync("git", ["rev-parse", "HEAD"], { cwd: repo, encoding: "utf8" }).trim();
  const packet = writePacket(state.root, repo, head);
  const env = { ...state.env, MOCK_PACKAGE_ID: "fixture-package", MOCK_BRANCH: "feature/fixture", MOCK_HEAD: head, MOCK_IGNORED: "1" };
  const result = spawnSync(process.execPath, [helper, "run", "--packet", packet, "--receipt", join(state.root, "receipt.json"), "--cwd", repo, "--json"], { encoding: "utf8", env, cwd: repo });
  assert.equal(result.status, 5);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.error.code, "EXECUTION_BOUNDARY_VIOLATION");
  assert.match(payload.error.details.join("\n"), /\.env/);
});

test("run blocks git push when the packet has no push authority", () => {
  const state = fixture();
  run(["setup"], { env: state.env });
  const { repo, head } = createRepo(state.root);
  const packet = writePacket(state.root, repo, head);
  const env = { ...state.env, MOCK_PACKAGE_ID: "fixture-package", MOCK_BRANCH: "feature/fixture", MOCK_HEAD: head, MOCK_PUSH: "1" };
  const result = run(["run", "--packet", packet, "--receipt", join(state.root, "receipt.json"), "--cwd", repo], { env, cwd: repo });
  assert.equal(result.data.envelope.executor.cause, "push-status=77");
});

test("run enforces a process-level timeout", () => {
  const state = fixture();
  run(["setup"], { env: state.env });
  const { repo, head } = createRepo(state.root);
  const packet = writePacket(state.root, repo, head);
  const env = { ...state.env, MOCK_PACKAGE_ID: "fixture-package", MOCK_BRANCH: "feature/fixture", MOCK_HEAD: head, MOCK_SLEEP_MS: "2500" };
  const result = spawnSync(process.execPath, [helper, "run", "--packet", packet, "--receipt", join(state.root, "receipt.json"), "--cwd", repo, "--timeout", "10ms", "--json"], { encoding: "utf8", env, cwd: repo });
  assert.equal(result.status, 4);
  assert.equal(JSON.parse(result.stdout).error.code, "PROCESS_TIMEOUT");
});
