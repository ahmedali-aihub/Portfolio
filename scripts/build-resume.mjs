// Builds resume/resume.html from src/data/resume.js, then prints it to
// public/Ahmed-Ali-Resume.pdf with headless Chrome.
//
// The layout follows "Jake's Resume" (the widely used single-column LaTeX
// template): centred small-caps name, ruled small-caps section headings,
// bold title + right-aligned dates, italic organisation line, compact bullets.
//
//   npm run resume          # HTML + PDF
//   npm run resume -- --html-only
//
// Set CHROME_PATH if Chrome is not in a default location.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resume as r } from "../src/data/resume.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const htmlPath = resolve(root, "resume/resume.html");
const pdfPath = resolve(root, "public/Ahmed-Ali-Resume.pdf");

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const bare = (url) => url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
const link = (href, text) => `<a href="${esc(href)}">${esc(text)}</a>`;

const bullets = (list) => `<ul>${list.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>`;

// Jake-style entry: bold title + right-aligned date, italic line + right-aligned place.
const entry = ({ title, right, sub, subRight, body = "" }) => `
    <div class="entry">
      <div class="row"><b>${title}</b><span>${right ?? ""}</span></div>
      ${sub || subRight ? `<div class="row small"><i>${sub ?? ""}</i><i>${subRight ?? ""}</i></div>` : ""}
      ${body}
    </div>`;

const education = r.education
  .map((e) =>
    entry({
      title: esc(e.school),
      right: esc(e.period) + (e.status === "In progress" ? " (expected)" : ""),
      sub: esc(e.degree),
    }),
  )
  .join("");

const experience = r.experience
  .map((e) =>
    entry({
      title: esc(e.role),
      right: esc(e.period),
      sub: esc(e.org),
      subRight: esc(e.place),
      body: bullets(e.bullets.map((b) => b)),
    }),
  )
  .join("");

const projects = r.projects
  .map(
    (p) => `
    <div class="entry">
      <div class="row"><span><b>${esc(p.name)}</b> <span class="sep">|</span> <i class="stack">${p.stack.map(esc).join(", ")}</i></span><span>${
        p.link ? link(p.link.href, "GitHub") : ""
      }</span></div>
      ${bullets(p.bullets)}
    </div>`,
  )
  .join("");

const skills = r.skills.map((s) => `<p><b>${esc(s.group)}:</b> ${s.items.map(esc).join(", ")}</p>`).join("");

const c = r.contact;
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${esc(r.name)} — ${esc(r.title)} — Resume</title>
<style>
  @font-face { font-family: "CMU Serif"; font-weight: 400; font-style: normal; src: url("fonts/cmu-serif-500-roman.woff2") format("woff2"); }
  @font-face { font-family: "CMU Serif"; font-weight: 400; font-style: italic; src: url("fonts/cmu-serif-500-italic.woff2") format("woff2"); }
  @font-face { font-family: "CMU Serif"; font-weight: 700; font-style: normal; src: url("fonts/cmu-serif-700-roman.woff2") format("woff2"); }
  @font-face { font-family: "CMU Serif"; font-weight: 700; font-style: italic; src: url("fonts/cmu-serif-700-italic.woff2") format("woff2"); }

  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: "CMU Serif", "Latin Modern Roman", "Times New Roman", serif; color: #000; font-size: 10.4pt; line-height: 1.22; }
  .page { width: 210mm; height: 297mm; padding: 11mm 14mm 9mm; }
  a { color: inherit; text-decoration: underline; text-decoration-thickness: 0.5pt; text-underline-offset: 1.2pt; }

  h1 { text-align: center; font-size: 26pt; font-weight: 700; font-variant: small-caps; line-height: 1.05; letter-spacing: 0.01em; }
  .contact { text-align: center; font-size: 9.6pt; margin-top: 1.6mm; line-height: 1.35; }
  .sep { padding: 0 0.7ex; }

  h2 { font-size: 12.6pt; font-weight: 400; font-variant: small-caps; letter-spacing: 0.02em; line-height: 1.1;
       margin-top: 4.2mm; padding-bottom: 0.2mm; border-bottom: 0.5pt solid #000; margin-bottom: 1.3mm; }

  .summary { font-size: 10pt; text-align: justify; margin-top: 0.4mm; }
  .entry { margin-top: 1.5mm; }
  .row { display: flex; justify-content: space-between; align-items: baseline; gap: 4mm; }
  .row b { font-size: 10.6pt; }
  .small { font-size: 9.6pt; }
  .stack { font-size: 9.8pt; }

  ul { list-style: none; margin: 0.5mm 0 0 4.6mm; font-size: 10pt; }
  li { position: relative; padding-left: 2.8mm; margin-top: 0.35mm; }
  li::before { content: "\\2022"; position: absolute; left: 0; font-size: 8pt; line-height: 1.7; }

  .skills { margin: 1mm 0 0 3.8mm; font-size: 10pt; }
  .skills p { margin-top: 0.3mm; }
</style>
</head>
<body>
<div class="page">
  <h1>${esc(r.name)}</h1>
  <p class="contact">
    ${esc(c.phone)} <span class="sep">|</span> ${link(`mailto:${c.email}`, c.email)} <span class="sep">|</span> ${esc(c.location)}<br>
    ${link(c.linkedin, bare(c.linkedin))} <span class="sep">|</span> ${link(c.github, bare(c.github))}
  </p>

  <h2>Summary</h2>
  <p class="summary">${esc(r.summary)}</p>

  <h2>Education</h2>${education}
  <h2>Experience</h2>${experience}
  <h2>Projects</h2>${projects}
  <h2>Technical Skills</h2>
  <div class="skills">${skills}</div>
</div>
</body>
</html>
`;

mkdirSync(dirname(htmlPath), { recursive: true });
writeFileSync(htmlPath, html);
console.log("wrote", htmlPath);

if (process.argv.includes("--html-only")) process.exit(0);

const candidates = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/usr/bin/google-chrome",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].filter(Boolean);
const chrome = candidates.find((p) => existsSync(p));
if (!chrome) {
  console.error("Chrome not found. Set CHROME_PATH and re-run.");
  process.exit(1);
}

execFileSync(
  chrome,
  [
    "--headless=new",
    "--disable-gpu",
    "--no-pdf-header-footer",
    "--virtual-time-budget=6000",
    `--print-to-pdf=${pdfPath}`,
    pathToFileURL(htmlPath).href,
  ],
  { stdio: "ignore" },
);
console.log("wrote", pdfPath);

const pages = (readFileSync(pdfPath, "latin1").match(/\/Type\s*\/Page[^s]/g) || []).length;
if (pages !== 1) {
  console.error(`WARNING: the resume is ${pages} pages. Shorten src/data/resume.js to fit one page.`);
  process.exitCode = 1;
}
