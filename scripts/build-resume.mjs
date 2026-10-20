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

const icon = {
  phone:
    '<svg class="stroke" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
  mail: '<svg class="stroke" viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>',
  pin: '<svg class="stroke" viewBox="0 0 24 24"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>',
  linkedin:
    '<svg class="fill" viewBox="0 0 24 24"><path d="M20.45 20.45h-3.56v-5.58c0-1.33-.02-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.95v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.38-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.07 2.07 0 1 1 0-4.13 2.07 2.07 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.8 0 0 .78 0 1.75v20.5C0 23.22.8 24 1.77 24h20.45c.98 0 1.78-.78 1.78-1.75V1.75C24 .78 23.2 0 22.22 0Z"/></svg>',
  github:
    '<svg class="fill" viewBox="0 0 24 24"><path d="M12 .5C5.73.5.98 5.24.98 11.52c0 5.02 3.26 9.28 7.78 10.78.57.1.78-.25.78-.55 0-.27-.01-1.16-.02-2.11-3.17.69-3.84-1.35-3.84-1.35-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.75 1.18 1.75 1.18 1.02 1.75 2.68 1.24 3.33.95.1-.74.4-1.24.72-1.53-2.53-.29-5.19-1.27-5.19-5.63 0-1.24.44-2.26 1.17-3.06-.12-.29-.51-1.45.11-3.02 0 0 .96-.31 3.14 1.17a10.9 10.9 0 0 1 5.72 0c2.18-1.48 3.14-1.17 3.14-1.17.62 1.57.23 2.73.11 3.02.73.8 1.17 1.82 1.17 3.06 0 4.37-2.67 5.34-5.21 5.62.41.36.77 1.06.77 2.14 0 1.54-.01 2.79-.01 3.17 0 .3.2.66.79.55 4.51-1.51 7.77-5.77 7.77-10.79C23.02 5.24 18.27.5 12 .5Z"/></svg>',
};

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
  .contact svg { width: 3.1mm; height: 3.1mm; vertical-align: -0.55mm; margin-right: 1.3mm; }
  .contact .stroke { fill: none; stroke: #000; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
  .contact .fill { fill: #000; }

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
    ${icon.phone}${esc(c.phone)} <span class="sep">|</span> ${icon.mail}${link(`mailto:${c.email}`, c.email)} <span class="sep">|</span> ${icon.pin}${esc(c.location)}<br>
    ${icon.linkedin}${link(c.linkedin, bare(c.linkedin))} <span class="sep">|</span> ${icon.github}${link(c.github, bare(c.github))}
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
