/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { marked } = require("marked");

const rootDir = __dirname;
const inputMd = path.join(rootDir, "国内生成AIサービス市場2026_成長領域レポート.md");
const tempHtml = path.join(rootDir, "国内生成AIサービス市場2026_成長領域レポート.tmp.html");
const outputPdf = path.join(rootDir, "国内生成AIサービス市場2026_成長領域レポート.pdf");
const edgeExe = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

if (!fs.existsSync(inputMd)) {
  throw new Error(`Input markdown not found: ${inputMd}`);
}
if (!fs.existsSync(edgeExe)) {
  throw new Error(`Microsoft Edge not found: ${edgeExe}`);
}

const md = fs.readFileSync(inputMd, "utf8");
const htmlBody = marked.parse(md);

const html = `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>国内生成AIサービス市場2026_成長領域レポート</title>
  <style>
    @page { size: A4; margin: 16mm 14mm; }
    body { font-family: "Yu Gothic UI", "Meiryo", sans-serif; color: #111827; line-height: 1.55; font-size: 11pt; }
    h1 { font-size: 20pt; margin: 0 0 8pt; }
    h2 { font-size: 15pt; margin: 18pt 0 8pt; border-bottom: 1px solid #d1d5db; padding-bottom: 4pt; }
    h3 { font-size: 12.5pt; margin: 14pt 0 6pt; }
    p, li { margin: 4pt 0; }
    ul, ol { padding-left: 18pt; }
    hr { border: 0; border-top: 1px solid #e5e7eb; margin: 12pt 0; }
    code { font-family: Consolas, monospace; font-size: 10pt; background: #f3f4f6; padding: 1pt 3pt; border-radius: 3px; }
  </style>
</head>
<body>
${htmlBody}
</body>
</html>`;

fs.writeFileSync(tempHtml, html, "utf8");

try {
  execFileSync(
    edgeExe,
    [
      "--headless=new",
      "--disable-gpu",
      `--print-to-pdf=${outputPdf}`,
      `file:///${tempHtml.replace(/\\/g, "/")}`,
    ],
    { stdio: "ignore" },
  );
  console.log(`Done: ${outputPdf}`);
} finally {
  if (fs.existsSync(tempHtml)) {
    fs.unlinkSync(tempHtml);
  }
}

