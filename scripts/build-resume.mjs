// Builds resume/resume.html from src/data/resume.js, then prints it to
// public/Ahmed-Ali-Resume.pdf with headless Chrome.
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

const icon = {
  mail: '<svg class="stroke" viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>',
  phone:
    '<svg class="stroke" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
  pin: '<svg class="stroke" viewBox="0 0 24 24"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>',
  linkedin:
    '<svg class="fill" viewBox="0 0 24 24"><path d="M20.45 20.45h-3.56v-5.58c0-1.33-.02-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.95v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.38-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.07 2.07 0 1 1 0-4.13 2.07 2.07 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.8 0 0 .78 0 1.75v20.5C0 23.22.8 24 1.77 24h20.45c.98 0 1.78-.78 1.78-1.75V1.75C24 .78 23.2 0 22.22 0Z"/></svg>',
  github:
    '<svg class="fill" viewBox="0 0 24 24"><path d="M12 .5C5.73.5.98 5.24.98 11.52c0 5.02 3.26 9.28 7.78 10.78.57.1.78-.25.78-.55 0-.27-.01-1.16-.02-2.11-3.17.69-3.84-1.35-3.84-1.35-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.75 1.18 1.75 1.18 1.02 1.75 2.68 1.24 3.33.95.1-.74.4-1.24.72-1.53-2.53-.29-5.19-1.27-5.19-5.63 0-1.24.44-2.26 1.17-3.06-.12-.29-.51-1.45.11-3.02 0 0 .96-.31 3.14 1.17a10.9 10.9 0 0 1 5.72 0c2.18-1.48 3.14-1.17 3.14-1.17.62 1.57.23 2.73.11 3.02.73.8 1.17 1.82 1.17 3.06 0 4.37-2.67 5.34-5.21 5.62.41.36.77 1.06.77 2.14 0 1.54-.01 2.79-.01 3.17 0 .3.2.66.79.55 4.51-1.51 7.77-5.77 7.77-10.79C23.02 5.24 18.27.5 12 .5Z"/></svg>',
};

const bullets = (list) => `<ul>${list.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>`;

const education = r.education
  .map(
    (e) => `
    <div class="item">
      <div class="row"><div><span class="title">${esc(e.school)}</span> <span class="org">· ${esc(e.degree)}</span></div><span class="date">${esc(e.period)}${e.status === "In progress" ? " (expected)" : ""}</span></div>
    </div>`,
  )
  .join("");

const experience = r.experience
  .map(
    (e) => `
    <div class="item">
      <div class="row"><div><span class="title">${esc(e.role)}</span> <span class="org">· ${esc(e.org)}</span></div><span class="date">${esc(e.period)}</span></div>
      ${bullets(e.bullets)}
    </div>`,
  )
  .join("");

const projects = r.projects
  .map(
    (p) => `
    <div class="item">
      <div class="row"><div><span class="title">${esc(p.name)}</span> <span class="tech">· ${p.stack.map(esc).join(" · ")}</span></div>${p.link ? `<span class="date">${esc(bare(p.link.href))}</span>` : ""}</div>
      ${bullets(p.bullets)}
    </div>`,
  )
  .join("");

const skills = r.skills.map((s) => `<dt>${esc(s.group)}</dt><dd>${s.items.map(esc).join(", ")}</dd>`).join("");

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${esc(r.name)} — ${esc(r.title)} — Resume</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  @page { size: A4; margin: 0; }
  :root { --ink:#15171a; --dim:#4a4f57; --faint:#7a808a; --line:#d9dce1; --accent:#2b3a67; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: "Inter","Segoe UI",Arial,sans-serif; color: var(--ink); font-size: 8.5pt; line-height: 1.38; }
  .page { width: 210mm; height: 297mm; padding: 11mm 14mm 8mm; display: flex; flex-direction: column; }

  header { padding-bottom: 3.6mm; border-bottom: 1.4px solid var(--ink); }
  h1 { font-size: 25pt; font-weight: 700; letter-spacing: -0.02em; line-height: 1.05; }
  .role { margin-top: 1.4mm; font-size: 10.5pt; font-weight: 500; color: var(--accent); letter-spacing: 0.01em; }
  .contact { margin-top: 2.8mm; display: flex; flex-wrap: wrap; gap: 1.2mm 5.5mm; font-size: 8.3pt; color: var(--dim); }
  .contact > * { display: inline-flex; align-items: center; gap: 1.8mm; color: inherit; text-decoration: none; }
  .contact svg { width: 3.3mm; height: 3.3mm; flex: none; color: var(--accent); }
  .contact .stroke { fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
  .contact .fill { fill: currentColor; }
  .contact .break { flex-basis: 100%; height: 0; margin: -0.7mm 0; }

  section { margin-top: 3.8mm; }
  h2 { font-size: 7.6pt; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; color: var(--accent);
       padding-bottom: 1.1mm; border-bottom: 1px solid var(--line); margin-bottom: 2.2mm; }
  .summary { color: var(--dim); }

  .item { margin-bottom: 2.3mm; }
  .item:last-child { margin-bottom: 0; }
  .row { display: flex; justify-content: space-between; align-items: baseline; gap: 4mm; }
  .title { font-weight: 600; font-size: 9.4pt; }
  .org { color: var(--dim); font-weight: 500; }
  .date { font-size: 8pt; color: var(--faint); white-space: nowrap; font-weight: 500; }
  .sub { color: var(--dim); }
  .tech { font-size: 7.9pt; color: var(--faint); font-weight: 500; }
  ul { margin-top: 0.9mm; padding-left: 4mm; }
  li { color: var(--dim); margin-bottom: 0.5mm; padding-left: 0.5mm; }
  li::marker { color: var(--accent); }

  .skills { display: grid; grid-template-columns: 33mm 1fr; row-gap: 1.2mm; column-gap: 3mm; }
  .skills dt { font-weight: 600; font-size: 8.6pt; }
  .skills dd { color: var(--dim); }
</style>
</head>
<body>
<div class="page">
  <header>
    <h1>${esc(r.name)}</h1>
    <p class="role">${esc(r.title)} &nbsp;·&nbsp; ${esc(r.subtitle)}</p>
    <p class="contact">
      <a href="mailto:${esc(r.contact.email)}">${icon.mail}${esc(r.contact.email)}</a>
      <span>${icon.phone}${esc(r.contact.phone)}</span>
      <span>${icon.pin}${esc(r.contact.location)}</span>
      <span class="break"></span>
      <a href="${esc(r.contact.linkedin)}">${icon.linkedin}${esc(bare(r.contact.linkedin))}</a>
      <a href="${esc(r.contact.github)}">${icon.github}${esc(bare(r.contact.github))}</a>
    </p>
  </header>

  <section><h2>Profile</h2><p class="summary">${esc(r.summary)}</p></section>
  <section><h2>Education</h2>${education}</section>
  <section><h2>Experience</h2>${experience}</section>
  <section><h2>Projects</h2>${projects}</section>
  <section><h2>Technical Skills</h2><dl class="skills">${skills}</dl></section>
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
