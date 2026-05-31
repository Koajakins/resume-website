#!/usr/bin/env node
// Reads blog post frontmatter and regenerates the writing cards in index.html
// between <!-- writing-posts:start --> and <!-- writing-posts:end --> sentinels.
// Run: node scripts/sync-writing.js

const fs = require("fs");
const path = require("path");

const POSTS_DIR = path.join(__dirname, "../blog/src/posts");
const INDEX_FILE = path.join(__dirname, "../index.html");
const MAX_POSTS = 5;

function parseFrontmatter(content) {
  const match = content.replace(/\r\n/g, "\n").match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const raw = match[1];
  const result = {};
  for (const line of raw.split("\n")) {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const val = line.slice(colonIdx + 1).trim().replace(/^["']|["']$/g, "");
    result[key] = val;
  }
  return result;
}

function slugFromFilename(filename) {
  return filename.replace(/\.md$/, "");
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function buildCard(post) {
  const date = formatDate(post.date);
  return `          <article class="edu-card">
            <div class="edu-header">
              <div>
                <h3 class="edu-degree">${post.title}</h3>
                <p class="edu-institution">${date} &middot; AWS Security</p>
              </div>
              <a href="/blog/${post.slug}/" class="btn btn-outline btn-sm">Read</a>
            </div>
            <p class="edu-detail">${post.excerpt}</p>
          </article>`;
}

function run() {
  const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith(".md"));

  const posts = files
    .map((f) => {
      const content = fs.readFileSync(path.join(POSTS_DIR, f), "utf8");
      const fm = parseFrontmatter(content);
      return { ...fm, slug: slugFromFilename(f) };
    })
    .filter((p) => p.title && p.date && !p.draft && !p.eleventyExcludeFromCollections)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, MAX_POSTS);

  const cards = posts.map(buildCard).join("\n");

  const html = fs.readFileSync(INDEX_FILE, "utf8");
  const START = "<!-- writing-posts:start -->";
  const END = "<!-- writing-posts:end -->";
  const startIdx = html.indexOf(START);
  const endIdx = html.indexOf(END);

  if (startIdx === -1 || endIdx === -1) {
    console.error("Sentinel comments not found in index.html");
    process.exit(1);
  }

  const updated =
    html.slice(0, startIdx + START.length) +
    "\n" +
    cards +
    "\n          " +
    html.slice(endIdx);

  fs.writeFileSync(INDEX_FILE, updated, "utf8");
  console.log(`sync-writing: wrote ${posts.length} post card(s) to index.html`);
}

run();
