#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmdirSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { externalToolbelt, redactExternalReceiptArgs, redactExternalReceiptValue } from "./lib/external-toolbelt.mjs";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const collector = join(scriptDir, "collect-review-context.mjs");
const SELF_SCAN_REVIEW_SIGNAL_BUDGET = 960;
const configuredRoot = process.env.REVIEW_LOOP_SMOKE_ROOT;
const root = configuredRoot ? resolve(configuredRoot) : mkdtempSync(join(tmpdir(), "review-loop-smoke-"));
if (configuredRoot) {
  const relativeToTemp = relative(resolve(tmpdir()), root);
  if (!relativeToTemp || relativeToTemp.startsWith("..") || isAbsolute(relativeToTemp)) {
    throw new Error("REVIEW_LOOP_SMOKE_ROOT must stay under the system temporary directory");
  }
  if (existsSync(root)) throw new Error(`REVIEW_LOOP_SMOKE_ROOT already exists: ${root}`);
  mkdirSync(root, { recursive: true });
}
const preserveRoot = process.env.REVIEW_LOOP_SMOKE_PRESERVE === "1";

function removeOwnedTree(path) {
  let stat;
  try {
    stat = lstatSync(path);
  } catch (error) {
    if (error?.code === "ENOENT") return;
    throw error;
  }
  if (stat.isDirectory() && !stat.isSymbolicLink()) {
    for (const entry of readdirSync(path)) removeOwnedTree(join(path, entry));
    rmdirSync(path);
    return;
  }
  unlinkSync(path);
}

function run(command, args, cwd) {
  return execFileSync(command, args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 24,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function write(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

function createRepo(name, files) {
  const repo = join(root, name);
  mkdirSync(repo, { recursive: true });
  run("git", ["init"], repo);
  run("git", ["-c", "user.name=Codex Smoke", "-c", "user.email=codex-smoke@example.local", "commit", "--allow-empty", "-m", "baseline"], repo);
  for (const [path, content] of Object.entries(files)) write(join(repo, path), content);
  return repo;
}

function commitAll(repo, message) {
  run("git", ["add", "."], repo);
  run("git", ["-c", "user.name=Codex Smoke", "-c", "user.email=codex-smoke@example.local", "commit", "-m", message], repo);
  return run("git", ["rev-parse", "HEAD"], repo).trim();
}

function collect(repo, extraArgs = []) {
  const hasCandidateMode = extraArgs.some((arg) => arg === "--candidate-mode" || String(arg).startsWith("--candidate-mode="));
  const hasHead = extraArgs.some((arg) => arg === "--head" || String(arg).startsWith("--head="));
  const candidateArgs = hasCandidateMode ? [] : ["--candidate-mode", hasHead ? "commit" : "worktree"];
  return run("node", [collector, ...candidateArgs, ...extraArgs], repo);
}

function expectIncludes(name, output, expected) {
  if (!output.includes(expected)) {
    throw new Error(`${name}: expected output to include ${JSON.stringify(expected)}`);
  }
}

function expectNotIncludes(name, output, unexpected) {
  if (output.includes(unexpected)) {
    throw new Error(`${name}: expected output not to include ${JSON.stringify(unexpected)}`);
  }
}

const receiptProbeToken = "review-probe-token-7a1d";
const receiptProbePassword = "review-probe-password-7a1d";
const redactedReceiptOutput = redactExternalReceiptValue(`Authorization: Bearer ${receiptProbeToken} target=https://probe-user:${receiptProbePassword}@staging.example.com/path?access_token=${receiptProbeToken}#fragment`);
const redactedReceiptArgs = redactExternalReceiptArgs(["--authorization", `Bearer ${receiptProbeToken}`, `https://staging.example.com/path?access_token=${receiptProbeToken}`]);
for (const value of [redactedReceiptOutput, JSON.stringify(redactedReceiptArgs)]) {
  expectNotIncludes("receipt-redaction", value, receiptProbeToken);
  expectNotIncludes("receipt-redaction", value, receiptProbePassword);
  expectNotIncludes("receipt-redaction", value, "https://staging.example.com");
}
expectIncludes("receipt-redaction", redactedReceiptOutput, "[redacted-url]");
expectIncludes("receipt-redaction", JSON.stringify(redactedReceiptArgs), "[redacted-argument]");
console.log("PASS receipt-redaction");

try {
if (process.env.REVIEW_LOOP_SMOKE_FAIL_AFTER_SETUP === "1") {
  throw new Error("injected smoke failure after setup");
}

const cases = [
  {
    name: "sql-risk",
    files: {
      "src/search.ts": `export async function searchUsers(prisma: any, term: string) {
  return prisma.$queryRawUnsafe(\`SELECT * FROM "User" WHERE name = '\${term}'\`);
}
`,
    },
    assert(output) {
      expectIncludes(this.name, output, "raw-sql-injection-risk");
      expectIncludes(this.name, output, "interpolated-raw-sql-risk");
      expectIncludes(this.name, output, "For raw SQL/security signals");
    },
  },
  {
    name: "n-plus-one",
    files: {
      "app/users.go": `package app

func LoadUsers(db DB, ids []int) []string {
  for _, id := range ids {
    db.Query("SELECT name FROM users WHERE id = ?", id)
  }
  return []string{"active"}
}
`,
    },
    assert(output) {
      expectIncludes(this.name, output, "possible-n-plus-one-query");
      expectIncludes(this.name, output, "For N+1 signals");
    },
  },
  {
    name: "unbounded-list-query",
    files: {
      "src/users.repository.ts": `export async function listUsers(prisma: any) {
  return prisma.user.findMany({
    where: { active: true },
  });
}
`,
    },
    assert(output) {
      expectIncludes(this.name, output, "unbounded-list-query");
      expectIncludes(this.name, output, "pagination/limit");
    },
  },
  {
    name: "web-runtime-security",
    files: {
      "src/render.ts": `import { exec } from "node:child_process";
import { readFileSync } from "node:fs";

export function renderHtml(element: HTMLElement, html: string) {
  element.innerHTML = html;
}

export function runReport(input: string) {
  exec("node scripts/report.js " + input);
}

export function readUserFile(req: { query: { path: string } }) {
  return readFileSync(req.query.path, "utf8");
}

export function logToken(token: string) {
  console.warn("accessToken", token);
}
`,
    },
    assert(output) {
      expectIncludes(this.name, output, "potential-xss-unsanitized-html");
      expectIncludes(this.name, output, "command-injection-risk");
      expectIncludes(this.name, output, "path-traversal-risk");
      expectIncludes(this.name, output, "sensitive-data-logging-risk");
    },
  },
  {
    name: "owasp-expanded-security",
    protectedConfig: `{"domainCatalogs":["lgpd","finance"]}`,
    files: {
      "src/security.ts": `import crypto from "node:crypto";
import { fetch } from "undici";

export function weakHash(password: string) {
  return crypto.createHash("md5").update(password).digest("hex");
}

export function cors(res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.cookie("session", "abc");
}

export async function callback(req: any, res: any) {
  await fetch(req.query.url);
  res.redirect(req.query.returnTo);
}

export function upload(app: any) {
  app.post("/upload", upload.single("file"), handler);
}

export function webhook(req: any) {
  return stripeWebhookPayload(req.body);
}

export async function login(req: any) {
  return authenticate(req.body.password);
}

export async function retryJob(client: any) {
  for (let index = 0; index < 3; index += 1) {
    await client.send();
  }
}
`,
    },
    assert(output) {
      expectIncludes(this.name, output, "weak-cryptographic-hash");
      expectIncludes(this.name, output, "permissive-cors-policy");
      expectIncludes(this.name, output, "cookie-missing-security-attributes");
      expectIncludes(this.name, output, "ssrf-risk-unvalidated-url-fetch");
      expectIncludes(this.name, output, "open-redirect-risk");
      expectIncludes(this.name, output, "file-upload-without-validation");
      expectIncludes(this.name, output, "webhook-without-signature-verification");
      expectIncludes(this.name, output, "auth-boundary-without-rate-limit-signal");
      expectIncludes(this.name, output, "retry-without-backoff-or-timeout");
      expectIncludes(this.name, output, "LGPD/privacy");
      expectIncludes(this.name, output, "Financeiro");
      expectIncludes(this.name, output, "For OWASP/security-boundary signals");
    },
  },
  {
    name: "calibrated-false-positive-guards",
    files: {
      "src/internal-navigation.tsx": `export function goHome(navigate: any, submissionId: string) {
  navigate({ to: "/submissoes/$submissionId", params: { submissionId } });
  throw redirect({ to: "/entrar" });
}
`,
      "src/fixed-parallel.ts": `export async function loadDetail(repo: any, id: string) {
  const [user, profile, settings] = await Promise.all([
    repo.user.findUnique({ where: { id } }),
    repo.profile.findUnique({ where: { id } }),
    repo.settings.findUnique({ where: { id } }),
  ]);
  return { user, profile, settings };
}
`,
      "src/local-ai.ts": `export class LocalAiClient {
  constructor(private readonly baseUrl: string) {}
  async complete(prompt: string) {
    return fetch(\`\${this.baseUrl}/completion\`, { method: "POST", body: JSON.stringify({ prompt }) });
  }
}
`,
      "src/schema.ts": `import { z } from "zod";
export const auditSchema = z.object({
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
`,
      "src/array-reduce.ts": `export function summarize(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0);
}
`,
      "playwright.config.ts": `import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  retries: 0,
  workers: 1,
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://127.0.0.1:3000",
  },
});
`,
    },
    assert(output) {
      expectNotIncludes(this.name, output, "open-redirect-risk");
      expectNotIncludes(this.name, output, "parallel-n-plus-one-query");
      expectNotIncludes(this.name, output, "ssrf-risk-unvalidated-url-fetch");
      expectNotIncludes(this.name, output, "config-token-weak-string-validation");
      expectNotIncludes(this.name, output, "possible-n-plus-one-query");
      expectNotIncludes(this.name, output, "retry-without-backoff-or-timeout");
    },
  },
  {
    name: "artifact-checkpoint",
    files: {
      ".playwright-cli/session.json": `{"status":"local"}`,
    },
    assert(output) {
      expectIncludes(this.name, output, "local-or-generated-artifacts-in-diff");
      expectIncludes(this.name, output, "artefatos locais/gerados");
    },
  },
  {
    name: "control-block-not-function",
    files: {
      "src/control.ts": `if (ready) {
  if (a) {
    if (b) {
      if (c) {
        if (d) {
          console.log("done");
        }
      }
    }
  }
}
`,
    },
    assert(output) {
      expectNotIncludes(this.name, output, "long-function-touched");
      expectNotIncludes(this.name, output, "deep-nesting-touched");
    },
  },
  {
    name: "prod-test-literal-classification",
    files: {
      "src/status.ts": `export function approve(status: string) {
  if (status === "APPROVED") return "APPROVED";
  return "PENDING";
}
`,
      "src/status.test.ts": `test("approved", () => {
  expect(approve("APPROVED")).toBe("APPROVED");
});
`,
    },
    assert(output) {
      expectIncludes(this.name, output, "duplicated-literal");
      expectIncludes(this.name, output, "prod files: 1; test files: 1");
      expectIncludes(this.name, output, "blocking:");
    },
  },
  {
    name: "local-literal-path",
    files: {
      "src/config.ts": `export const callbackUrl = "http://localhost:3000/callback";
export const cachePath = "/Users/example/project/cache";
`,
    },
    assert(output) {
      expectIncludes(this.name, output, "local-literal-path-or-url");
      expectIncludes(this.name, output, "hardcoded local paths");
    },
  },
  {
    name: "mock-only-test",
    files: {
      "src/user.test.ts": `test("calls repository", () => {
  const repo = { save: jest.fn() };
  repo.save({ id: "user-1" });
  expect(repo.save).toHaveBeenCalledWith({ id: "user-1" });
});
`,
    },
    assert(output) {
      expectIncludes(this.name, output, "mock-only-test-path");
      expectIncludes(this.name, output, "mock-heavy");
    },
  },
  {
    name: "stale-test-mock-and-narrating-comment",
    files: {
      "src/useLearningProgress.ts": `import { getCourseProgressSummary, listEnrollments } from "@/lib/apiEnrollments";

export async function useLearningProgress(productId: string) {
  // 2) Para os que tem matrícula, busca o resumo de progresso por produto
  const enrollments = await listEnrollments();
  return getCourseProgressSummary({ productId, enrollmentId: enrollments[0]?.id });
}
`,
      "src/useLearningProgress.test.ts": `import { expect, test, vi } from "vitest";
import { useLearningProgress } from "./useLearningProgress";

const getCourseProgressSummaryMock = vi.fn();
const fetchCourseByProductIdMock = vi.fn();

vi.mock("@/lib/apiEnrollments", () => ({
  listEnrollments: vi.fn(),
  getCourseProgressSummary: (...args) => getCourseProgressSummaryMock(...args),
}));

vi.mock("@/lib/apiProducts", () => ({
  fetchCourseByProductId: (...args) => fetchCourseByProductIdMock(...args),
}));

test("loads progress", async () => {
  await useLearningProgress("product-1");
  expect(fetchCourseByProductIdMock).not.toHaveBeenCalled();
});
`,
    },
    assert(output) {
      expectIncludes(this.name, output, "stale-or-orphaned-test-mock");
      expectIncludes(this.name, output, "no changed production file imports");
      expectIncludes(this.name, output, "implementation-narrating-comment");
    },
  },
  {
    name: "happy-path-only",
    files: {
      "src/service.ts": `export function createUser(input: { email: string }) {
  return { ok: true, email: input.email };
}
`,
      "src/service.test.ts": `import { createUser } from "./service";

test("creates valid user successfully", () => {
  expect(createUser({ email: "a@b.test" }).ok).toBe(true);
});
`,
    },
    assert(output) {
      expectIncludes(this.name, output, "happy-path-only-test-change");
      expectIncludes(this.name, output, "failure, invalid, empty");
    },
  },
  {
    name: "masked-error-state-console-warn-and-duplicated-helper",
    files: {
      "src/ProductsCarousel.tsx": `function productSlotKey(productId: string, index: number) {
  return productId + "-" + index;
}

export function ProductsCarousel() {
  return productSlotKey("product-1", 0);
}
`,
      "src/ProductsSection.tsx": `function productSlotKey(productId: string, index: number) {
  return productId + "-" + index;
}

async function fetchProductByIdOrNull(productId: string) {
  try {
    return await fetchProductById(productId);
  } catch (err) {
    console.warn("[products-section] falha ao buscar produto", err);
    return null;
  }
}

export function ProductsSection({ productQueries }: { productQueries: Array<{ isError: boolean }> }) {
  const isError = productQueries.some((query) => query.isError);
  return isError ? "Erro ao carregar produtos desta seção." : productSlotKey("product-1", 0);
}
`,
    },
    assert(output) {
      expectIncludes(this.name, output, "error-state-masked-by-null-fallback");
      expectIncludes(this.name, output, "direct-console-warning");
      expectIncludes(this.name, output, "duplicated-helper-function");
      expectIncludes(this.name, output, "productSlotKey");
    },
  },
  {
    name: "branding-advanced-contract-risks",
    files: {
      "src/brandingPatch.ts": `export function buildChangedValue(draft: unknown, persisted: unknown) {
  if (draft === persisted) return undefined;
  return draft;
}

export function buildPatch(draft: { sidebar?: { itemRadius?: string } }, persisted: { sidebar?: { itemRadius?: string } }) {
  const changedValue = buildChangedValue(draft.sidebar?.itemRadius, persisted.sidebar?.itemRadius);
  const patch: { sidebar?: { itemRadius?: string } } = {};
  if (changedValue !== undefined) {
    patch.sidebar = { itemRadius: changedValue as string };
  }
  return patch;
}

export function applyObjectPatch(base: Record<string, unknown>, patch: Record<string, unknown>) {
  return { ...base, ...patch };
}
`,
      "src/brandingPatch.test.ts": `import { buildPatch } from "./brandingPatch";

test("salva patch de sidebar alterada", () => {
  expect(buildPatch({ sidebar: { itemRadius: "lg" } }, { sidebar: { itemRadius: "sm" } })).toEqual({
    sidebar: { itemRadius: "lg" },
  });
});
`,
      "src/PreviewArea.tsx": `export function PreviewArea({ activeTab, sections, onSectionsChange, appearance }) {
  return activeTab === "showcase" || activeTab === "settings" ? (
    <ShowcasePreview
      sections={sections}
      onSectionsChange={onSectionsChange}
      appearance={appearance}
    />
  ) : null;
}
`,
      "src/SidebarItemIcon.tsx": `const iconPath = "M4 4h16v16H4z";

export function SidebarItemIcon({ iconLibrary, iconStyle }) {
  const scale = iconLibrary === "phosphor" || iconLibrary === "heroicons" || iconLibrary === "tabler" || iconLibrary === "remix" ? 1.05 : 1;
  return (
    <svg style={{ transform: "scale(" + scale + ")" }}>
      <path d={iconPath} opacity={iconStyle === "duotone" ? 0.5 : 1} />
    </svg>
  );
}
`,
      "src/appearance.ts": `export const ICON_LIBRARIES = ["lucide", "phosphor", "tabler", "heroicons", "remix"] as const;

export function normalizeMemberAreaAppearance(input: any) {
  return {
    iconLibrary: input.iconLibrary ?? "lucide",
    iconStyle: input.iconStyle ?? "line",
    hoverEffect: input.hoverEffect ?? "soft",
    activeEffect: input.activeEffect ?? "solid",
    transitionPreset: input.transitionPreset ?? "fast",
    itemRadius: input.itemRadius ?? "md",
    height: input.height ?? "default",
    searchStyle: input.searchStyle ?? "pill",
    actionStyle: input.actionStyle ?? "ghost",
  };
}
`,
      "src/MemberSidebar.tsx": `export function MemberSidebar({ sidebar }) {
  const sidebarStyle = {
    "--member-sidebar-hover-bg": sidebar.itemHoverBackgroundColor,
    "--member-sidebar-active-bg": sidebar.itemActiveBackgroundColor,
    "--member-sidebar-border": sidebar.borderColor,
    "--member-sidebar-item-radius": sidebar.itemRadius,
  };
  return <aside style={sidebarStyle} />;
}
`,
      "src/sidebarBackground.ts": `export function resolveSidebarBackgroundStyle(sidebar) {
  if (sidebar.backgroundColor?.includes("gradient(")) {
    return { backgroundImage: sidebar.backgroundColor };
  }
  return { backgroundColor: sidebar.backgroundColor };
}
`,
    },
    assert(output) {
      expectIncludes(this.name, output, "patch-undefined-no-change-ambiguity");
      expectIncludes(this.name, output, "deep-merge-without-removal-semantics");
      expectIncludes(this.name, output, "patch-reset-coverage-gap");
      expectIncludes(this.name, output, "preview-tab-passes-edit-callback");
      expectIncludes(this.name, output, "simulated-icon-library-contract");
      expectIncludes(this.name, output, "enum-field-without-membership-normalization");
      expectIncludes(this.name, output, "unsanitized-branding-css-token");
      expectIncludes(this.name, output, "background-color-carries-gradient");
    },
  },
  {
    name: "public-contract-root-risks",
    files: {
      "src/contracts/account.response.ts": `type AccountBranding = {
  privateToken?: string;
  backgroundColor?: string;
};

type PublicAccountBranding = {
  backgroundColor?: string;
};

export type AccountPublicResponse = {
  id: string;
  branding: AccountBranding;
};

function sanitizeAccountBranding(branding: AccountBranding): PublicAccountBranding {
  return { backgroundColor: branding.backgroundColor };
}

export function toPublicAccountResponse(state: { id: string; legacy: AccountBranding }) {
  const publicLegacy = sanitizeAccountBranding(state.legacy);
  return {
    id: state.id,
    branding: state.legacy,
    publicBranding: publicLegacy,
  };
}
`,
      "src/contracts/theme.dto.ts": `function IsString() {
  return function noop() {};
}

export class ThemeInputDto {
  @IsString()
  accentColor?: string;

  @IsString()
  sidebarRadius?: string;

  @IsString()
  iconStyle?: string;
}
`,
      "src/contracts/theme-defaults.ts": `export const DEFAULT_HEADER_APPEARANCE = {
  backgroundColor: "#fff",
  foregroundColor: "#111",
  gradientFrom: "#fff",
  gradientTo: "#eee",
  iconStyle: "line",
  hoverEffect: "soft",
  activeEffect: "solid",
  itemRadius: "md",
};

export const DEFAULT_SIDEBAR_APPEARANCE = {
  backgroundType: "solid",
  shape: "flat",
};

export const runtimeFields = {
  accentColor: true,
  backgroundGradient: true,
  borderRadius: true,
  iconStyle: true,
  transitionPreset: true,
  hoverEffect: true,
  activeEffect: true,
};
`,
    },
    assert(output) {
      expectIncludes(this.name, output, "public-contract-bypasses-sanitizer");
      expectIncludes(this.name, output, "public-response-uses-internal-type");
      expectIncludes(this.name, output, "config-token-weak-string-validation");
      expectIncludes(this.name, output, "config-defaults-asymmetry-signal");
    },
  },
  {
    name: "bundle-code-splitting-signal",
    files: {
      "src/routes/dashboard.tsx": `import MonacoEditor from "monaco-editor";

export function DashboardRoute() {
  return <MonacoEditor />;
}
`,
    },
    assert(output) {
      expectIncludes(this.name, output, "static-heavy-ui-import-without-lazy-boundary");
      expectIncludes(this.name, output, "route-level code-splitting");
      expectIncludes(this.name, output, "review-signal:");
    },
  },
  {
    name: "rest-api-design",
    files: {
      "src/orders.controller.ts": `function Get(path: string) {
  return function noop() {};
}

function Post(path: string) {
  return function noop() {};
}

export class OrdersController {
  @Get("/api/delete/order")
  deleteOrder() {
    return { ok: true };
  }

  @Get("/orders")
  listOrders() {
    return prisma.order.findMany({ where: { archived: false } });
  }

  @Post("/orders")
  createOrder() {
    return { id: "order-1" };
  }
}
`,
    },
    assert(output) {
      expectIncludes(this.name, output, "rest-route-uses-verb-segment");
      expectIncludes(this.name, output, "rest-get-mutating-action-signal");
      expectIncludes(this.name, output, "rest-list-without-pagination-or-filter-signal");
      expectIncludes(this.name, output, "rest-mutation-without-status-signal");
      expectIncludes(this.name, output, "For REST/API design signals");
    },
  },
  {
    name: "nestjs-framework-boundaries",
    files: {
      "src/orders.controller.ts": `function Controller(path: string) {
  return function noop() {};
}
function Post(path: string) {
  return function noop() {};
}

@Controller("/orders")
export class OrdersController {
  constructor(private readonly prisma: PrismaService) {}

  @Post("/")
  async create(body: CreateOrderDto) {
    return this.prisma.order.create({ data: body });
  }
}
`,
      "src/create-order.dto.ts": `function ValidateNested() {
  return function noop() {};
}

export class CreateOrderDto {
  @ValidateNested()
  address!: AddressDto;
}
`,
      "src/orders.service.ts": `function Injectable() {
  return function noop() {};
}

@Injectable()
export class OrdersService {
  private readonly gateway = new PaymentClient();
}
`,
    },
    assert(output) {
      expectIncludes(this.name, output, "nestjs-controller-direct-data-access");
      expectIncludes(this.name, output, "nestjs-mutating-route-without-auth-signal");
      expectIncludes(this.name, output, "nestjs-nested-dto-without-type-transform");
      expectIncludes(this.name, output, "nestjs-provider-bypasses-di");
      expectIncludes(this.name, output, "For NestJS framework signals");
    },
  },
  {
    name: "ui-semantics-a11y",
    files: {
      "src/pages/DashboardPage.tsx": `export function DashboardPage() {
  return (
    <div>
      <div><img src="/logo.png" /></div>
      <div onClick={() => save()}>Salvar</div>
      <input value="" onChange={() => {}} />
      <a onClick={() => save()}>Executar</a>
      <button href="/settings">Configuracoes</button>
      ${Array.from({ length: 12 }, (_, index) => `<div>Item ${index}</div>`).join("\n      ")}
    </div>
  );
}
`,
    },
    assert(output) {
      expectIncludes(this.name, output, "ui-image-missing-alt");
      expectIncludes(this.name, output, "ui-input-without-label-signal");
      expectIncludes(this.name, output, "ui-clickable-div-without-keyboard-semantics");
      expectIncludes(this.name, output, "ui-anchor-used-as-button");
      expectIncludes(this.name, output, "ui-button-used-as-link");
      expectIncludes(this.name, output, "ui-page-without-semantic-landmarks");
      expectIncludes(this.name, output, "For UI semantics/accessibility signals");
    },
  },
  {
    name: "architecture-boundaries",
    files: {
      "src/domain/order.ts": `import { PrismaClient } from "../infra/prisma";

export class OrderPolicy {
  constructor(private readonly prisma = new PrismaClient()) {}
}
`,
      "src/components/OrdersPage.tsx": `import { prisma } from "../infra/prisma";

export function OrdersPage() {
  const orders = prisma.order.findMany();
  return <div>{orders.length}</div>;
}
`,
    },
    assert(output) {
      expectIncludes(this.name, output, "domain-layer-imports-outer-layer");
      expectIncludes(this.name, output, "presentation-imports-data-layer");
      expectIncludes(this.name, output, "ui-mixes-presentation-and-data-access");
      expectIncludes(this.name, output, "For architecture/layering signals");
    },
  },
  {
    name: "call-graph-and-data-flow",
    files: {
      "src/controllers/accounts.controller.ts": `import { loadAccounts } from "../services/accounts.service";
import { AccountRepository } from "../repositories/account.repository";

export async function listAccounts(password: string, tenantId: string) {
  return loadAccounts([tenantId], new AccountRepository());
}
`,
      "src/services/accounts.service.ts": `import { helper } from "./cycle-a";

export async function loadAccounts(ids: string[], repo: any) {
  helper();
  return ids.map((id) => repo.findUnique({ where: { id } }));
}
`,
      "src/services/cycle-a.ts": `import { other } from "./cycle-b";
export function helper() { return other(); }
`,
      "src/services/cycle-b.ts": `import { helper } from "./cycle-a";
export function other() { return helper; }
`,
      "src/repositories/account.repository.ts": `export class AccountRepository {
  findUnique(input: unknown) { return input; }
}
`,
    },
    assert(output) {
      expectIncludes(this.name, output, "dependency-cycle-detected");
      expectIncludes(this.name, output, "sensitive-data-crosses-layer-without-boundary");
      expectIncludes(this.name, output, "n-plus-one-through-route-call-chain-signal");
      expectIncludes(this.name, output, "For architecture/layering signals");
    },
  },
  {
    name: "graphql-grpc-realtime",
    files: {
      "src/graphql/order.resolver.ts": `export const resolvers = {
  Query: {
    orders: () => prisma.order.findMany({ where: { archived: false } }),
  },
  Mutation: {
    deleteOrder: (_root, args) => prisma.order.delete({ where: { id: args.id } }),
  },
  Subscription: {
    orderUpdated: { subscribe: () => pubsub.subscribe("ORDER_UPDATED") },
  },
};

export const server = new ApolloServer({ introspection: true, playground: true });
`,
      "proto/orders.proto": `syntax = "proto3";
service OrdersService {
  rpc CreateOrder (CreateOrderRequest) returns (Order) {}
}
message CreateOrderRequest {
  string id = 1;
}
message Order {
  string id = 1;
}
`,
      "src/websocket/orders.socket.ts": `export function attach(io) {
  io.on("connection", (socket) => {
    socket.on("orders:subscribe", (payload) => socket.join(payload.channel));
    socket.emit("ready");
  });
}
`,
    },
    assert(output) {
      expectIncludes(this.name, output, "graphql-resolver-n-plus-one-or-unbounded-risk");
      expectIncludes(this.name, output, "graphql-mutation-without-boundary-controls");
      expectIncludes(this.name, output, "graphql-subscription-without-scope-or-backpressure");
      expectIncludes(this.name, output, "graphql-introspection-enabled-without-prod-guard");
      expectIncludes(this.name, output, "grpc-proto-without-compatibility-signal");
      expectIncludes(this.name, output, "websocket-handler-without-auth-or-backpressure");
      expectIncludes(this.name, output, "For GraphQL signals");
      expectIncludes(this.name, output, "For gRPC/WebSocket/realtime signals");
    },
  },
  {
    name: "async-events-and-serverless",
    files: {
      "src/workers/payment.consumer.ts": `export async function processPaymentJob(job: { data: { orderId: string } }) {
  await charge(job.data.orderId);
}

export const workerOptions = {
  retry: true,
};
`,
      "serverless.yml": `service: payments
functions:
  charge:
    handler: src/workers/payment.consumer.processPaymentJob
    runtime: nodejs20.x
`,
    },
    assert(output) {
      expectIncludes(this.name, output, "event-consumer-without-idempotency-signal");
      expectIncludes(this.name, output, "event-worker-without-backoff-or-concurrency-limit");
      expectIncludes(this.name, output, "serverless-function-without-runtime-limits");
      expectIncludes(this.name, output, "For event/serverless signals");
    },
  },
  {
    name: "observability-resilience",
    protectedConfig: `{"appType":"microservice"}`,
    files: {
      "src/services/payment-client.ts": `export async function charge(req) {
  try {
    return await fetch(req.body.callbackUrl);
  } catch (error) {
    logger.error("payment failed", error);
    throw error;
  }
}
`,
      "src/routes/auth.ts": `export async function loginHandler(req) {
  try {
    return await authenticate(req.body);
  } catch (error) {
    throw new Error("access denied");
  }
}
`,
    },
    assert(output) {
      expectIncludes(this.name, output, "external-call-without-timeout-or-resilience");
      expectIncludes(this.name, output, "critical-boundary-without-instrumentation-signal");
      expectIncludes(this.name, output, "unstructured-error-log-without-correlation");
      expectIncludes(this.name, output, "security-event-without-observability-signal");
      expectIncludes(this.name, output, "For observability/resilience signals");
    },
  },
  {
    name: "api-contract-docs-coverage",
    protectedConfig: `{"appType":"public-api","coverageLinesMin":90}`,
    files: {
      "README.md": `# Demo

Run the app locally.
`,
      "CONTRIBUTING.md": `# Contributing

Keep commits tidy.
`,
      "coverage/coverage-summary.json": `{"total":{"lines":{"pct":72},"statements":{"pct":72}}}`,
      "src/controllers/public.controller.ts": `function Get(path: string) { return function noop() {}; }
export class PublicController {
  @Get("/users")
  list() { return []; }
}
`,
      "src/graphql/users.resolver.ts": `export class UsersResolver {
  @Query()
  users() { return []; }
}
`,
      "proto/users.proto": `syntax = "proto3";
service Users { rpc List (ListRequest) returns (ListResponse); }
message ListRequest { string id = 1; }
message ListResponse { string id = 1; }
`,
    },
    assert(output) {
      expectIncludes(this.name, output, "api-controller-without-openapi-contract-signal");
      expectIncludes(this.name, output, "graphql-resolver-without-schema-or-complexity-signal");
      expectIncludes(this.name, output, "protobuf-contract-without-breaking-check-signal");
      expectIncludes(this.name, output, "coverage-report-below-threshold");
      expectIncludes(this.name, output, "readme-missing-api-env-usage-signal");
      expectIncludes(this.name, output, "contributing-missing-review-test-policy");
    },
  },
  {
    name: "e2e-autofix-observability-i18n",
    protectedConfig: `{
  "appType": "public-api",
  "e2eCoverageReportPaths": ["coverage/e2e/coverage-summary.json"],
  "contractTestReportPaths": ["reports/contracts/openapi-results.json"],
  "criticalFlowKeywords": ["auth", "checkout"],
  "e2eCoverageMin": 85,
  "contractPassRateMin": 100,
  "reviewFeedbackPath": "docs/ai/review-loop-feedback.json"
}`,
    files: {
      "docs/ai/review-loop-feedback.json": `{"feedback":[
  {"rule":"ui-hardcoded-text-without-i18n","outcome":"false-positive"},
  {"rule":"ui-hardcoded-text-without-i18n","outcome":"false-positive"},
  {"rule":"external-call-without-circuit-breaker","outcome":"false-negative"},
  {"rule":"external-call-without-circuit-breaker","outcome":"false-negative"}
]}`,
      "coverage/e2e/coverage-summary.json": `{"total":{"lines":{"pct":62},"statements":{"pct":62}},"auth":{"lines":{"pct":55}}}`,
      "reports/contracts/openapi-results.json": `{"stats":{"tests":4,"failures":1}}`,
      "src/users.dto.ts": `function ValidateNested() { return function noop() {}; }
export class CreateUserDto {
  @ValidateNested()
  profile!: ProfileDto;
}
`,
      "src/services/payment-client.ts": `export async function charge(input) {
  return await fetch(input.url);
}
`,
      "src/controllers/app.controller.ts": `export class AppController {
  getProfile(req) {
    logger.error("request failed");
    return req.user;
  }
}
`,
      "src/components/Checkout.tsx": `export function Checkout() {
  return <button style={{ color: "#777777", backgroundColor: "#888888" }}>Comprar agora</button>;
}
`,
      "package.json": `{"dependencies":{"react-intl":"latest"}}`,
    },
    assert(output) {
      expectIncludes(this.name, output, "e2e-critical-flow-coverage-below-threshold");
      expectIncludes(this.name, output, "contract-test-report-failure-signal");
      expectIncludes(this.name, output, "nestjs-nested-dto-without-type-transform");
      expectIncludes(this.name, output, "Suggested patch (dry-run");
      expectIncludes(this.name, output, "external-call-without-circuit-breaker");
      expectIncludes(this.name, output, "missing-correlation-id-boundary");
      expectIncludes(this.name, output, "ui-hardcoded-text-without-i18n");
      expectIncludes(this.name, output, "possible-low-contrast-color-pair");
      expectIncludes(this.name, output, "feedback items: 4");
      expectIncludes(this.name, output, "false-positive feedback");
      expectIncludes(this.name, output, "false-negative feedback");
    },
  },
  {
    name: "advanced-a11y-and-ui-performance",
    files: {
      "src/layout/AppShell.tsx": `export function AppShell() {
  return (
    <div>
      <nav>Menu</nav>
      <main>
        <button role="button" tabIndex={2} aria-label="">Salvar</button>
        <div aria-hidden="true" onClick={() => save()} tabIndex={0}>Hidden action</div>
        <input className="focus:outline-none" />
      </main>
    </div>
  );
}
`,
      "src/components/SearchBox.tsx": `export function SearchBox({ items }) {
  const parsed = JSON.parse(localStorage.getItem("cache") || "[]");
  return <input onChange={(event) => fetch("/api/search?q=" + event.target.value)} value={parsed.length} />;
}
`,
      "package.json": `{"dependencies":{"monaco-editor":"latest"}}`,
    },
    assert(output) {
      expectIncludes(this.name, output, "positive-tabindex-a11y-risk");
      expectIncludes(this.name, output, "redundant-or-conflicting-aria-role");
      expectIncludes(this.name, output, "aria-misuse-a11y-risk");
      expectIncludes(this.name, output, "focus-visible-style-missing");
      expectIncludes(this.name, output, "missing-skip-link-for-repeated-navigation");
      expectIncludes(this.name, output, "ui-network-on-input-without-debounce");
      expectIncludes(this.name, output, "ui-render-blocking-work-signal");
      expectIncludes(this.name, output, "heavy-dependency-without-bundle-budget");
      expectIncludes(this.name, output, "For advanced accessibility signals");
      expectIncludes(this.name, output, "For UI performance/bundle signals");
    },
  },
  {
    name: "backend-boundary-without-integration",
    files: {
      "src/users.controller.ts": `export class UsersController {
  create(body: { name: string }) {
    return { id: "user-1", name: body.name };
  }
}
`,
      "src/users.controller.spec.ts": `import { UsersController } from "./users.controller";

test("creates user", () => {
  expect(new UsersController().create({ name: "Ana" }).id).toBe("user-1");
});
`,
    },
    assert(output) {
      expectIncludes(this.name, output, "backend-boundary-without-e2e-or-integration");
      expectIncludes(this.name, output, "integration/e2e path");
    },
  },
  {
    name: "features-folder-is-production",
    files: {
      "src/features/dashboard/components/Panel.tsx": `export function Panel() {
  return <div>Dashboard</div>;
}
`,
    },
    assert(output) {
      expectNotIncludes(this.name, output, "weak-test-assertion-signal");
      expectIncludes(this.name, output, "no-test-file-changed");
    },
  },
  {
    name: "python-any-builtin-safe",
    files: {
      "src/rules.py": `def has_keyword(values, keywords):
    return any(keyword in values for keyword in keywords)
`,
    },
    assert(output) {
      expectNotIncludes(this.name, output, "unsafe-typing");
    },
  },
  {
    name: "app-api-path-not-contract",
    files: {
      "apps/api/prisma/migrations/20260401000000_init/migration.sql": `ALTER TABLE "Import" ADD COLUMN "tenantId" TEXT;
CREATE INDEX "Import_tenantId_idx" ON "Import"("tenantId");
`,
    },
    assert(output) {
      expectNotIncludes(this.name, output, "For cross-repo or contract/schema/API/client changes");
      expectNotIncludes(this.name, output, "occurrences of");
    },
  },
  {
    name: "append-only-changelog-no-refactor-gate",
    files: {
      "src/lib/data/changelog.ts": `${Array.from({ length: 520 }, (_, index) => `export const entry${index} = "Release ${index}";`).join("\n")}
`,
    },
    assert(output) {
      expectNotIncludes(this.name, output, "large-file-touched");
      expectNotIncludes(this.name, output, "multiple-responsibilities-in-large-file");
    },
  },
  {
    name: "minified-third-party-bundle-is-artifact",
    files: {
      "public/pdf.worker.min.mjs": `try{console.log("debug")}catch(e){};const names=["string","number","string","number","string","number","string","number"];describe.skip("vendor",()=>{});`,
    },
    assert(output) {
      expectIncludes(this.name, output, "local-or-generated-artifacts-in-diff");
      expectNotIncludes(this.name, output, "test-focus-artifact");
      expectNotIncludes(this.name, output, "occurrences of");
    },
  },
];

for (const testCase of (process.env.REVIEW_LOOP_SMOKE_FOCUSED === "1" ? [] : cases)) {
  const repo = createRepo(testCase.name, testCase.files);
  const protectedConfigPath = testCase.protectedConfig ? join(root, "protected-policy", `${testCase.name}.json`) : "";
  if (protectedConfigPath) write(protectedConfigPath, testCase.protectedConfig);
  const output = collect(repo, protectedConfigPath ? ["--config", protectedConfigPath] : []);
  testCase.assert(output);
  console.log(`PASS ${testCase.name}`);
}

const candidateScopeRepo = createRepo("candidate-scope", {
  "src/scope.ts": `export const candidate = "base";\n`,
});
const candidateScopeBase = commitAll(candidateScopeRepo, "candidate scope base");
write(join(candidateScopeRepo, "src/scope.ts"), `export const candidate = "INDEX_ONLY";\n`);
run("git", ["add", "src/scope.ts"], candidateScopeRepo);
write(join(candidateScopeRepo, "src/scope.ts"), `export const candidate = "UNSTAGED_SECRET_DO_NOT_PACKET";\n`);
write(join(candidateScopeRepo, "untracked-secret.txt"), "UNTRACKED_SECRET_DO_NOT_PACKET\n");
const indexPacket = JSON.parse(collect(candidateScopeRepo, ["--candidate-mode", "index", "--base", candidateScopeBase, "--json"]));
const indexRepoPacket = indexPacket.repositories?.[0];
if (!indexRepoPacket || indexRepoPacket.candidateIdentity.mode !== "index" || indexRepoPacket.candidateIdentity.base !== candidateScopeBase) {
  throw new Error("candidate-index-scope: expected the index identity and explicit base");
}
if (indexRepoPacket.files.some((entry) => entry.path === "untracked-secret.txt")
  || JSON.stringify(indexPacket).includes("UNSTAGED_SECRET_DO_NOT_PACKET")
  || JSON.stringify(indexPacket).includes("UNTRACKED_SECRET_DO_NOT_PACKET")) {
  throw new Error("candidate-index-scope: excluded unstaged or untracked content entered the packet");
}
const indexFingerprint = indexRepoPacket.candidateIdentity.sha256;
try {
  collect(candidateScopeRepo, ["--candidate-mode", "index", "--base", candidateScopeBase, "--candidate-fingerprint", "0".repeat(64)]);
  throw new Error("candidate-fingerprint-mismatch: expected collector failure");
} catch (error) {
  expectIncludes("candidate-fingerprint-mismatch", String(error), "candidate fingerprint mismatch");
}
const verifiedIndexPacket = JSON.parse(collect(candidateScopeRepo, ["--candidate-mode", "index", "--base", candidateScopeBase, "--candidate-fingerprint", indexFingerprint, "--json"]));
if (verifiedIndexPacket.repositories?.[0]?.candidateIdentity?.sha256 !== indexFingerprint) {
  throw new Error("candidate-fingerprint-binding: supplied fingerprint was not bound to the packet");
}
const worktreePacket = JSON.parse(collect(candidateScopeRepo, ["--candidate-mode", "worktree", "--base", candidateScopeBase, "--json"]));
const worktreeFiles = worktreePacket.repositories?.[0]?.files || [];
if (!worktreeFiles.some((entry) => entry.path === "untracked-secret.txt")
  || !worktreeFiles.some((entry) => entry.path === "src/scope.ts" && /M/.test(entry.status))
  || !worktreePacket.repositories?.[0]?.candidateIdentity?.fileSnapshots?.some((entry) => entry.path === "untracked-secret.txt")) {
  throw new Error("candidate-worktree-scope: staged, unstaged, and untracked state were not all collected");
}
write(join(candidateScopeRepo, "src/scope.ts"), `export const candidate = "COMMIT_EXACT";\n`);
run("git", ["add", "src/scope.ts"], candidateScopeRepo);
const candidateScopeHead = commitAll(candidateScopeRepo, "candidate exact head");
write(join(candidateScopeRepo, "src/scope.ts"), `export const candidate = "WORKTREE_NOT_COMMIT";\n`);
const commitPacket = JSON.parse(collect(candidateScopeRepo, ["--candidate-mode", "commit", "--base", candidateScopeBase, "--head", candidateScopeHead, "--json"]));
if (commitPacket.repositories?.[0]?.candidateIdentity?.head !== candidateScopeHead
  || JSON.stringify(commitPacket).includes("WORKTREE_NOT_COMMIT")) {
  throw new Error("candidate-commit-scope: collector did not use the exact base..head candidate");
}
console.log("PASS candidate-mode-scope-and-fingerprint");

const receiptHomeProbe = process.env.HOME || "/private/home";
const receiptSecret = "TEST_FIXTURE_RECEIPT_SECRET_VALUE";
const privateCollectorConfig = join(root, "private-policy", "collector.json");
write(privateCollectorConfig, JSON.stringify({ metadata: { apiToken: receiptSecret }, customQuestions: ["safe question"] }));
const privatePacketJson = collect(candidateScopeRepo, ["--candidate-mode", "worktree", "--base", candidateScopeBase, "--config", privateCollectorConfig, "--json"]);
const privatePacketMarkdown = collect(candidateScopeRepo, ["--candidate-mode", "worktree", "--base", candidateScopeBase, "--config", privateCollectorConfig]);
for (const value of [privatePacketJson, privatePacketMarkdown]) {
  expectNotIncludes("collector-receipt-privacy", value, privateCollectorConfig);
  expectNotIncludes("collector-receipt-privacy", value, receiptHomeProbe);
  expectNotIncludes("collector-receipt-privacy", value, receiptSecret);
  expectNotIncludes("collector-receipt-privacy", value, "Command:");
}
const toolReceipts = externalToolbelt({
  root: receiptHomeProbe,
  entries: [{ path: "src/example.ts" }],
  config: { a11yTargets: [`https://example.invalid/?access_token=${receiptSecret}`] },
}, false, false, ["gitleaks", "not-an-allowed-tool"]);
for (const receipt of toolReceipts) {
  const keys = Object.keys(receipt).sort().join(",");
  if (keys !== "available,id,ran,status") throw new Error(`toolbelt-receipt-allowlist: unexpected receipt keys ${keys}`);
}
const receiptJson = JSON.stringify(toolReceipts);
if (receiptJson.includes(receiptHomeProbe) || receiptJson.includes(receiptSecret) || receiptJson.includes("--source")) {
  throw new Error("toolbelt-receipt-privacy: receipt leaked a root, secret, or raw command argument");
}
console.log("PASS toolbelt-receipt-allowlist");

const antiSlopReceipt = externalToolbelt({
  root: candidateScopeRepo,
  entries: [{ path: "src/example.ts" }],
  config: {},
}, false, false, ["anti-slop"]);
if (antiSlopReceipt.length !== 1 || antiSlopReceipt[0].id !== "anti-slop" || antiSlopReceipt[0].status !== "missing") {
  throw new Error("anti-slop-toolbelt: an unconfigured repository must report anti-slop as missing without installing it");
}
console.log("PASS anti-slop-toolbelt");

if (process.env.REVIEW_LOOP_SMOKE_FOCUSED !== "1") {
const crossRepoRoot = join(root, "cross-repo");
const producer = createRepo("cross-repo/producer", {
  "src/contracts/user.dto.ts": `export type UserDto = { id: string; status: "ACTIVE" };`,
});
const consumer = createRepo("cross-repo/consumer", {
  "src/client.ts": `export function renderUser(user: { id: string }) { return user.id; }`,
});
const crossRepoOutput = run("node", [collector, "--candidate-mode", "worktree", "--root", producer, "--root", consumer], crossRepoRoot);
expectIncludes("cross-repo-contract", crossRepoOutput, "cross-repo-contract-without-consumer-check");
expectIncludes("cross-repo-contract", crossRepoOutput, "consumer compatibility");
console.log("PASS cross-repo-contract");

const historicalRepo = createRepo("historical-head-range", {
  "src/service.ts": `export function status() {
  return "SAFE";
}
`,
});
const historicalBase = commitAll(historicalRepo, "base");
write(join(historicalRepo, "src/service.ts"), `export function status(input: string) {
  if (input === "APPROVED") return "APPROVED";
  return "PENDING";
}
`);
const historicalHead = commitAll(historicalRepo, "head with literal");
write(join(historicalRepo, "src/service.ts"), `export function status() {
  return "WORKTREE_ONLY";
}
`);
const historicalOutput = collect(historicalRepo, ["--base", historicalBase, "--head", historicalHead]);
expectIncludes("historical-head-range", historicalOutput, "APPROVED");
expectNotIncludes("historical-head-range", historicalOutput, "WORKTREE_ONLY");
console.log("PASS historical-head-range");

const symlinkEscapeRepo = createRepo("symlink-escape", {});
const outsideSymlinkTarget = join(root, "outside-symlink-target.ts");
write(outsideSymlinkTarget, `export const leaked = "APPROVED";`);
mkdirSync(join(symlinkEscapeRepo, "src"), { recursive: true });
symlinkSync(outsideSymlinkTarget, join(symlinkEscapeRepo, "src/leak.ts"));
run("git", ["add", "."], symlinkEscapeRepo);
const symlinkEscapeOutput = collect(symlinkEscapeRepo);
expectNotIncludes("symlink-escape", symlinkEscapeOutput, "APPROVED");
console.log("PASS symlink-escape");

const configPathEscapeRepo = createRepo("config-path-escape", {
  ".review-loop.json": `{
  "e2eCoverageReportPaths": ["../outside-e2e-coverage.json"],
  "e2eCoverageMin": 80,
  "criticalFlowKeywords": ["login"]
}
`,
  "src/login.route.ts": `export function login() {
  return "ok";
}
`,
});
write(join(root, "outside-e2e-coverage.json"), `{"total":{"lines":{"pct":1}},"flow":"login"}`);
const configPathEscapeOutput = collect(configPathEscapeRepo);
expectNotIncludes("config-path-escape", configPathEscapeOutput, "e2e-critical-flow-coverage-below-threshold");
console.log("PASS config-path-escape");

const selfScanRepo = createRepo("self-scan-defaults", {});
write(join(selfScanRepo, "SKILL.md"), `---
name: review-loop
description: test fixture
---

# Review Loop
`);
write(join(selfScanRepo, "scripts/collect-review-context.mjs"), `function scanRawSqlSecurity() {
  const rawSqlPattern = /\\$queryRawUnsafe|whereRaw|sequelize\\.query/;
  addFinding(findings, "raw-sql-injection-risk", "high", "repo", "file", 1, rawSqlPattern, "Prefer parameterized query APIs.");
}
`);
write(join(selfScanRepo, "scripts/smoke-review-toolbelt.mjs"), `import crypto from "node:crypto";
export function weakHash(password) {
  return crypto.createHash("md5").update(password).digest("hex");
}
`);
const selfScanOutput = collect(selfScanRepo);
expectNotIncludes("self-scan-defaults", selfScanOutput, "raw-sql-injection-risk at scripts/collect-review-context.mjs");
const selfScanPacket = JSON.parse(collect(selfScanRepo, ["--json"]));
const selfScanFiles = selfScanPacket.repositories?.[0]?.files?.map((entry) => entry.path) || [];
if (!selfScanFiles.includes("SKILL.md") || !selfScanFiles.includes("scripts/collect-review-context.mjs")) {
  throw new Error("self-scan-defaults: expected SKILL.md and collect-review-context.mjs to stay in the packet");
}
if ((selfScanPacket.repositories?.[0]?.findings || []).some((finding) => finding.file === "scripts/smoke-review-toolbelt.mjs")) {
  throw new Error("self-scan-defaults: expected smoke-review-toolbelt.mjs findings to be ignored");
}
console.log("PASS self-scan-defaults");

const selectedToolOutput = collect(historicalRepo, ["--external-tool", "jscpd"]);
expectIncludes("external-tool-selection", selectedToolOutput, "Selected tools: jscpd");
expectIncludes("external-tool-selection", selectedToolOutput, "jscpd");
expectNotIncludes("external-tool-selection", selectedToolOutput, "madge");
console.log("PASS external-tool-selection");

const selectedAdvancedToolOutput = collect(historicalRepo, ["--external-tool", "semgrep-autofix"]);
expectIncludes("advanced-tool-selection", selectedAdvancedToolOutput, "Selected tools: semgrep-autofix");
expectIncludes("advanced-tool-selection", selectedAdvancedToolOutput, "semgrep-autofix");
expectNotIncludes("advanced-tool-selection", selectedAdvancedToolOutput, "autocannon");
console.log("PASS advanced-tool-selection");

const adaptiveToolRepo = createRepo("adaptive-language-tools", {
  "pom.xml": `<project><modelVersion>4.0.0</modelVersion><groupId>x</groupId><artifactId>x</artifactId><version>1</version></project>`,
  "src/main/java/App.java": `class App {}`,
  "native/main.cpp": `int main() { return 0; }`,
  "composer.json": `{"require": {}}`,
  "src/index.php": `<?php echo "ok";`,
  "src/App.tsx": `export function App() { return <img src="/logo.png" />; }`,
  "eslint.config.js": `export default [];`,
  "schema.graphql": `type Query { viewer: String }`,
  "proto/service.proto": `syntax = "proto3"; service Demo { rpc Ping (PingRequest) returns (PingResponse); } message PingRequest { string id = 1; } message PingResponse { string id = 1; }`,
});
const adaptiveToolOutput = collect(adaptiveToolRepo);
expectIncludes("adaptive-language-tools", adaptiveToolOutput, "spotbugs");
expectIncludes("adaptive-language-tools", adaptiveToolOutput, "findsecbugs");
expectIncludes("adaptive-language-tools", adaptiveToolOutput, "jdeps");
expectIncludes("adaptive-language-tools", adaptiveToolOutput, "buf");
expectIncludes("adaptive-language-tools", adaptiveToolOutput, "cppcheck");
expectIncludes("adaptive-language-tools", adaptiveToolOutput, "clang-tidy");
expectIncludes("adaptive-language-tools", adaptiveToolOutput, "phpstan");
expectIncludes("adaptive-language-tools", adaptiveToolOutput, "psalm");
expectIncludes("adaptive-language-tools", adaptiveToolOutput, "eslint-jsx-a11y");
console.log("PASS adaptive-language-tools");

const selectedGraphqlToolOutput = collect(adaptiveToolRepo, ["--external-tool", "graphql-inspector"]);
expectIncludes("graphql-tool-selection", selectedGraphqlToolOutput, "Selected tools: graphql-inspector");
expectIncludes("graphql-tool-selection", selectedGraphqlToolOutput, "graphql-inspector");
expectNotIncludes("graphql-tool-selection", selectedGraphqlToolOutput, "size-limit");
console.log("PASS graphql-tool-selection");

const jsonOutput = collect(historicalRepo, ["--base", historicalBase, "--head", historicalHead, "--json"]);
const jsonPacket = JSON.parse(jsonOutput);
if (jsonPacket.status !== "ok" || jsonPacket.crossRepoSummary.findings < 1 || !Array.isArray(jsonPacket.repositories)) {
  throw new Error("json-output: expected structured ok packet with findings and repositories");
}
console.log("PASS json-output");

const configuredRepo = createRepo("configured-rules", {
  ".review-loop.json": `{
  "rules": { "magic-string": false },
  "customQuestions": ["Custom checkpoint?"],
  "domainCatalogs": ["education"],
  "customDomainQuestions": { "education": ["Custom education checkpoint?"] },
  "ignorePaths": ["ignored/**"],
  "a11yTargets": ["https://candidate.invalid/dashboard"]
}
`,
  "src/status.ts": `export function approve(status: string) {
  if (status === "APPROVED") return "APPROVED";
  return "PENDING";
}
`,
  "ignored/debug.ts": `console.warn("should be ignored");`,
});
const candidateConfigOutput = collect(configuredRepo, ["--external-tool", "axe"]);
expectIncludes("candidate-config-cannot-mute", candidateConfigOutput, "] magic-string at");
expectIncludes("candidate-config-cannot-mute", candidateConfigOutput, "ignored/debug.ts");
expectNotIncludes("candidate-config-cannot-mute", candidateConfigOutput, "Custom checkpoint?");
expectNotIncludes("candidate-config-cannot-probe", candidateConfigOutput, "https://candidate.invalid/dashboard");
expectNotIncludes("candidate-config-cannot-probe", candidateConfigOutput, "- [available] axe:");
expectIncludes("candidate-config-delta", candidateConfigOutput, "candidate-review-config-change");
expectIncludes("candidate-config-delta", candidateConfigOutput, "Candidate config delta: .review-loop.json (not applied)");
console.log("PASS candidate-config-cannot-mute-or-probe");

const protectedConfigPath = join(root, "protected-policy", "configured-rules.json");
write(protectedConfigPath, `{
  "rules": { "magic-string": false },
  "customQuestions": ["Custom checkpoint?"],
  "domainCatalogs": ["education"],
  "customDomainQuestions": { "education": ["Custom education checkpoint?"] },
  "ignorePaths": ["ignored/**"],
  "a11yTargets": ["https://staging.example.com/dashboard"]
}`);
const protectedConfigArgs = [
  "--config", protectedConfigPath,
  "--external-tool", "axe",
  "--authorize-external-probes",
  "--allow-external-target", "https://staging.example.com",
];
const protectedConfigOutput = collect(configuredRepo, protectedConfigArgs);
const protectedConfigPacket = JSON.parse(collect(configuredRepo, [...protectedConfigArgs, "--json"]));
expectNotIncludes("protected-config-applies", protectedConfigOutput, "] magic-string at");
if ((protectedConfigPacket.repositories?.[0]?.findings || []).some((finding) => finding.file === "ignored/debug.ts")) {
  throw new Error("protected-config-applies: ignored path produced a finding");
}
expectIncludes("protected-config-applies", protectedConfigOutput, "Custom checkpoint?");
expectIncludes("protected-config-applies", protectedConfigOutput, "Educação:");
expectIncludes("protected-config-applies", protectedConfigOutput, "Custom education checkpoint?");
expectIncludes("protected-config-applies", protectedConfigOutput, "External targets: authorized");
expectIncludes("protected-config-applies", protectedConfigOutput, "axe");
expectNotIncludes("protected-config-receipt-redaction", protectedConfigOutput, "https://staging.example.com/dashboard");
console.log("PASS protected-config-applies");

const probePrivacyConfigPath = join(root, "protected-policy", "probe-privacy.json");
write(probePrivacyConfigPath, `{
  "a11yTargets": [
    "https://probe-user:${receiptProbePassword}@staging.example.com/dashboard",
    "https://staging.example.com/dashboard?access_token=${receiptProbeToken}",
    "https://staging.example.com/dashboard#${receiptProbeToken}",
    "https://staging.example.com/safe"
  ]
}`);
const probePrivacyOutput = collect(configuredRepo, [
  "--config", probePrivacyConfigPath,
  "--external-tool", "axe",
  "--authorize-external-probes",
  "--allow-external-target", "https://staging.example.com",
]);
const probePrivacyJson = collect(configuredRepo, [
  "--config", probePrivacyConfigPath,
  "--external-tool", "axe",
  "--authorize-external-probes",
  "--allow-external-target", "https://staging.example.com",
  "--json",
]);
for (const value of [probePrivacyOutput, probePrivacyJson]) {
  expectNotIncludes("probe-url-privacy", value, receiptProbeToken);
  expectNotIncludes("probe-url-privacy", value, receiptProbePassword);
  expectNotIncludes("probe-url-privacy", value, "https://staging.example.com");
}
expectIncludes("probe-url-privacy", probePrivacyOutput, "External targets: partially-authorized");
expectIncludes("probe-url-privacy", probePrivacyOutput, "Rejected targets: 3 (redacted)");
console.log("PASS probe-url-privacy");

const pinnedBaseConfigRepo = createRepo("pinned-base-config", {
  ".review-loop.json": `{"rules":{"magic-string":false}}`,
  "src/status.ts": `export function status() { return "PENDING"; }`,
});
const pinnedBase = commitAll(pinnedBaseConfigRepo, "trusted base policy");
write(join(pinnedBaseConfigRepo, ".review-loop.json"), `{"rules":{"magic-string":true},"a11yTargets":["https://candidate.invalid/dashboard"]}`);
write(join(pinnedBaseConfigRepo, "src/status.ts"), `export function status(input: string) {
  return input === "APPROVED" ? "APPROVED" : "PENDING";
}
`);
const pinnedBaseConfigOutput = collect(pinnedBaseConfigRepo, ["--base", pinnedBase, "--base-config", ".review-loop.json"]);
expectNotIncludes("pinned-base-config", pinnedBaseConfigOutput, "] magic-string at");
expectNotIncludes("pinned-base-config", pinnedBaseConfigOutput, "https://candidate.invalid/dashboard");
expectIncludes("pinned-base-config", pinnedBaseConfigOutput, "candidate-review-config-change");
expectIncludes("pinned-base-config", pinnedBaseConfigOutput, "Protected config: base-config");
console.log("PASS pinned-base-config");

const ratchetRepo = createRepo("quality-gate-ratchet", {
  "package.json": `{
  "scripts": {
    "lint": "eslint .",
    "test": "vitest run",
    "test:coverage": "vitest run --coverage",
    "build": "tsc -p tsconfig.json"
  }
}
`,
  "src/index.ts": `export function sum(left: number, right: number) {
  // Business invariant: keep the smoke behavior deterministic for future agents.
  return left + right;
}
`,
});
commitAll(ratchetRepo, "baseline");
const ratchetGenerator = join(scriptDir, "generate-quality-gate-ratchet.mjs");
const ratchetOutput = run("node", [ratchetGenerator, "--root", ratchetRepo, "--write", "--json"], ratchetRepo);
const ratchetPacket = JSON.parse(ratchetOutput);
if (ratchetPacket.status !== "ok" || !ratchetPacket.files.includes("docs/ai/quality-gate/check-ratchet.mjs") || !ratchetPacket.files.includes("docs/ai/quality-gate/refresh-baseline.mjs") || !ratchetPacket.files.includes("docs/ai/quality-gate/review-feedback.json")) {
  throw new Error("quality-gate-ratchet: expected generated ratchet files");
}
const generatedRatchetWorkflow = readFileSync(join(ratchetRepo, "docs/ai/quality-gate/github-action-quality-gate-ratchet.yml"), "utf8");
expectIncludes("quality-gate-ratchet", generatedRatchetWorkflow, "name: Review Loop Quality Gate");
expectIncludes("quality-gate-ratchet", generatedRatchetWorkflow, "REVIEW_LOOP_BASE");
expectIncludes("quality-gate-ratchet", generatedRatchetWorkflow, "review-loop-packet.json");
expectIncludes("quality-gate-ratchet", generatedRatchetWorkflow, "--candidate-mode commit");
expectIncludes("quality-gate-ratchet", generatedRatchetWorkflow, "vendor/collect-review-context.mjs");
expectIncludes("quality-gate-ratchet", generatedRatchetWorkflow, "eventName === \"pull_request\"");
expectIncludes("quality-gate-ratchet", generatedRatchetWorkflow, "eventName === \"push\"");
expectIncludes("quality-gate-ratchet", generatedRatchetWorkflow, "eventName === \"workflow_dispatch\"");
expectIncludes("quality-gate-ratchet", generatedRatchetWorkflow, "eventPayload?.pull_request?.base?.sha");
expectIncludes("quality-gate-ratchet", generatedRatchetWorkflow, "eventPayload?.before");
expectIncludes("quality-gate-ratchet", generatedRatchetWorkflow, "value + \"^\"");
expectIncludes("quality-gate-ratchet", generatedRatchetWorkflow, "GITHUB_EVENT_NAME: ${{ github.event_name }}");
expectIncludes("quality-gate-ratchet", generatedRatchetWorkflow, "GITHUB_EVENT_PATH: ${{ github.event_path }}");
expectIncludes("quality-gate-ratchet", generatedRatchetWorkflow, "GITHUB_SHA: ${{ github.sha }}");
expectNotIncludes("quality-gate-ratchet", generatedRatchetWorkflow, "origin/main");
expectNotIncludes("quality-gate-ratchet", generatedRatchetWorkflow, "execSync(`git");
expectNotIncludes("quality-gate-ratchet", generatedRatchetWorkflow, "Agentic");
expectNotIncludes("quality-gate-ratchet", generatedRatchetWorkflow, "pull-requests: write");
expectNotIncludes("quality-gate-ratchet", generatedRatchetWorkflow, "GITHUB_TOKEN:");
expectNotIncludes("quality-gate-ratchet", generatedRatchetWorkflow, "post-pr-comment.mjs");
for (const relativePath of [
  "vendor/collect-review-context.mjs",
  "vendor/fingerprint-review-state.mjs",
  "vendor/lib/external-toolbelt.mjs",
  "vendor/lib/gate-categories.mjs",
]) {
  if (!existsSync(join(ratchetRepo, "docs/ai/quality-gate", relativePath))) {
    throw new Error(`quality-gate-ratchet: generated package is missing ${relativePath}`);
  }
}
const ratchetBase = run("git", ["rev-parse", "HEAD"], ratchetRepo).trim();
write(join(ratchetRepo, "src/index.ts"), `export function sum(left: number, right: number) {
  // Business invariant: keep the smoke behavior deterministic for future agents.
  return left + right + 1;
}
`);
const ratchetHead = commitAll(ratchetRepo, "candidate");
const vendoredRatchetPacket = run("node", [
  join(ratchetRepo, "docs/ai/quality-gate/vendor/collect-review-context.mjs"),
  "--candidate-mode", "commit", "--base", ratchetBase, "--head", ratchetHead, "--json",
], ratchetRepo);
expectNotIncludes("quality-gate-ratchet-vendor", vendoredRatchetPacket, "Cannot find module");
expectIncludes("quality-gate-ratchet-vendor", vendoredRatchetPacket, '"repositories"');
write(join(ratchetRepo, "coverage/coverage-summary.json"), `{"total":{"lines":{"pct":85},"statements":{"pct":85},"branches":{"pct":80},"functions":{"pct":85}}}`);
write(join(ratchetRepo, "docs/ai/quality-gate/review-loop-packet.json"), `{"repositories":[]}`);
const ratchetCheckOutput = run("node", [join(ratchetRepo, "docs/ai/quality-gate/check-ratchet.mjs")], ratchetRepo);
expectIncludes("quality-gate-ratchet", ratchetCheckOutput, '"status": "pass"');
expectIncludes("quality-gate-ratchet", readFileSync(join(ratchetRepo, "docs/ai/quality-gate/quality-gate-report.md"), "utf8"), "| Verificacao | Referencia/base | Medido nesta PR | Regra do gate | Diferenca/tempo | Decisao |");
expectIncludes("quality-gate-ratchet", readFileSync(join(ratchetRepo, "docs/ai/quality-gate/quality-trend-entry.json"), "utf8"), "largeFiles");
write(join(ratchetRepo, "docs/ai/quality-gate/review-feedback.json"), `{"feedback":[{"case":"smoke","rule":"missing-detector","outcome":"false-negative","recommendation":"Add detector coverage."}]}`);
const ratchetFeedbackOutput = run("node", [join(ratchetRepo, "docs/ai/quality-gate/check-ratchet.mjs")], ratchetRepo);
expectIncludes("quality-gate-ratchet", ratchetFeedbackOutput, "false-negative");
expectIncludes("quality-gate-ratchet", readFileSync(join(ratchetRepo, "docs/ai/quality-gate/auto-improvement-queue.json"), "utf8"), "Add detector coverage.");
run("node", [join(ratchetRepo, "docs/ai/quality-gate/refresh-baseline.mjs")], ratchetRepo);
console.log("PASS quality-gate-ratchet");

expectIncludes("collector-namespace", readFileSync(collector, "utf8"), "looksLikeReviewForgeSkill");
console.log("PASS review-loop-namespace");

const skillText = readFileSync(join(scriptDir, "..", "SKILL.md"), "utf8");
const referenceFiles = [
  "correctness-and-risk.md",
  "quality-simplification.md",
  "semantic-integrity.md",
  "documentation-impact.md",
  "engine-selection.md",
  "review-protocol.md",
  "reviewer-contract.md",
];
const referenceTexts = referenceFiles.map((file) => readFileSync(join(scriptDir, "..", "references", file), "utf8"));
const skillCorpus = [skillText, ...referenceTexts].join("\n");
expectIncludes("deterministic-is-not-gate", skillText, "The deterministic collector is tool support for the reviewer.");
expectIncludes("independent-review", skillText, "fresh, read-only reviewer");
for (const file of referenceFiles) {
  expectIncludes("reference-routing", skillText, `references/${file}`);
}
for (const gate of ["CORRECTNESS", "SIMPLIFICATION", "SEMANTICS", "DOCUMENTATION", "VERIFICATION"]) {
  expectIncludes("five-gate-contract", skillText, `\`${gate}\``);
}
expectIncludes("definition-of-done", skillText, "## Definition of done");
expectIncludes("self-approval-denied", skillText, "fixing agent must never approve");
expectIncludes("review-only-authority", skillText, "In a review-only task, return the findings without");
expectIncludes("fresh-candidate-review", skillText, "verdict never survives a changed candidate identity");
expectIncludes("simplification-gate", skillCorpus, "Prefer deleting incidental complexity");
expectIncludes("semantic-gate", skillCorpus, "roadmap phases");
expectIncludes("documentation-gate", skillCorpus, "NOT_APPLICABLE");
expectIncludes("engine-explicit-choice", skillCorpus, "The user chooses one exact reviewer and one exact fixer per harness");
expectIncludes("engine-no-fallback", skillCorpus, "default, ranking, substitution, or fallback");
expectIncludes("engine-cost-ceiling", skillCorpus, "extreme premium candidate only through a recorded escalation");
expectIncludes("fixer-boundary", skillCorpus, "The fixer must not approve");
expectNotIncludes("no-local-user-paths", skillCorpus, "/Users/");
console.log("PASS public-skill-contract");

const packageValidationOutput = run("node", [join(scriptDir, "validate-skill-package.mjs")], join(scriptDir, ".."));
expectIncludes("skill-package-validation", packageValidationOutput, '"status": "ok"');
expectIncludes("skill-package-validation", packageValidationOutput, '"publicCorpusLines"');
expectIncludes("skill-package-validation", packageValidationOutput, '"mandatoryGates": 5');
console.log("PASS skill-package-validation");

const isolatedPackage = join(root, "isolated-skill-package");
cpSync(join(scriptDir, ".."), isolatedPackage, { recursive: true });
const isolatedCollector = join(isolatedPackage, "scripts", "collect-review-context.mjs");
run("git", ["init", "--quiet"], isolatedPackage);
run("git", ["-c", "user.name=Codex Smoke", "-c", "user.email=codex-smoke@example.local", "commit", "--allow-empty", "-m", "baseline"], isolatedPackage);
const realSelfScanPacket = JSON.parse(run("node", [isolatedCollector, "--candidate-mode", "worktree", "--json"], isolatedPackage));
const realSelfScanRepo = realSelfScanPacket.repositories?.[0];
if (!realSelfScanRepo) throw new Error("self-scan-noise-budget: expected repository packet");
const realSelfScanFiles = realSelfScanRepo.files?.map((entry) => entry.path) || [];
if (!realSelfScanFiles.includes("scripts/validate-skill-package.mjs")) {
  throw new Error("self-scan-noise-budget: expected package validator to stay visible in self-scan packet");
}
const validatorHighFindings = (realSelfScanRepo.findings || [])
  .filter((finding) => finding.file === "scripts/validate-skill-package.mjs" && finding.severity === "high");
if (validatorHighFindings.length) {
  throw new Error(`self-scan-noise-budget: package validator still has high findings (${JSON.stringify(validatorHighFindings)})`);
}
const intentionalFixtureFindings = (realSelfScanRepo.findings || []).filter((finding) => finding.file === "scripts/smoke-review-toolbelt.mjs"
  || /^scripts\/test-.*\.mjs$/.test(finding.file)
  || /^fixtures\//.test(finding.file));
if (intentionalFixtureFindings.length > 0) {
  throw new Error("self-scan-noise-budget: expected intentional fixture findings to stay out of self-scan packet");
}
if ((realSelfScanRepo.normalizedGateSummary?.blocking || 0) !== 0
  || (realSelfScanRepo.normalizedGateSummary?.["review-signal"] || 0) > SELF_SCAN_REVIEW_SIGNAL_BUDGET) {
  throw new Error(`self-scan-noise-budget: too noisy (${JSON.stringify({ findings: realSelfScanRepo.findingsSummary, gate: realSelfScanRepo.normalizedGateSummary })})`);
}
console.log("PASS self-scan-noise-budget");

console.log(`PASS ${cases.length} detector cases plus deterministic integration checks`);
}
} finally {
  if (!preserveRoot) removeOwnedTree(root);
}
