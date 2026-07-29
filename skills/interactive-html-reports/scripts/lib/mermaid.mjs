import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const chromeCandidates = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
];

function formatMermaidError(error, title, chrome) {
  if (error.code === "ENOENT") {
    return `Mermaid diagram "${title || "sem titulo"}" requires mmdc, but the mmdc command was not found.`;
  }
  const details = String(error.stderr || error.message || "");
  if (/Could not find Chrome|Failed to launch the browser|TROUBLESHOOTING/i.test(details)) {
    return [
      `Mermaid diagram "${title || "sem titulo"}" requires mmdc with a working Chrome/Chromium executable.`,
      chrome ? `Chrome candidate used: ${chrome}.` : "No local Chrome/Chromium candidate was found.",
      "Run outside the sandbox or install/configure the browser expected by Mermaid CLI.",
    ].join(" ");
  }
  return `Mermaid diagram "${title || "sem titulo"}" failed to render with mmdc: ${details || error.message}`;
}

export function renderMermaid(source, title) {
  const tempDir = mkdtempSync(join(tmpdir(), "report-mermaid-"));
  const input = join(tempDir, "diagram.mmd");
  const output = join(tempDir, "diagram.svg");
  const chrome = chromeCandidates.find((candidate) => existsSync(candidate));
  const puppeteerConfig = join(tempDir, "puppeteer-config.json");

  try {
    writeFileSync(input, source, "utf8");
    const args = ["-i", input, "-o", output, "-b", "transparent"];
    const env = { ...process.env };
    if (chrome) {
      env.PUPPETEER_EXECUTABLE_PATH = chrome;
      writeFileSync(
        puppeteerConfig,
        JSON.stringify({ executablePath: chrome, args: ["--no-sandbox", "--disable-setuid-sandbox"] }),
        "utf8",
      );
      args.push("-p", puppeteerConfig);
    }
    execFileSync("mmdc", args, { stdio: "pipe", env });
    return readFileSync(output, "utf8");
  } catch (error) {
    throw new Error(formatMermaidError(error, title, chrome));
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}
