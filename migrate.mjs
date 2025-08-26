import fs from 'fs/promises';
import path from 'path';
import { JSDOM } from 'jsdom';
import TurndownService from 'turndown';

const turndownService = new TurndownService();

async function migratePost(postDir) {
  try {
    const htmlPath = path.join('posts', postDir, 'index.html');
    let htmlContent = await fs.readFile(htmlPath, 'utf-8');

    // Remove style tags
    htmlContent = htmlContent.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

    const dom = new JSDOM(htmlContent);
    const document = dom.window.document;

    const titleElement = document.querySelector('h1');
    const title = titleElement ? titleElement.textContent.trim() : 'Untitled';

    const dateElement = document.querySelector('p[style*="font-size:0.83255rem"]');
    const date = dateElement ? dateElement.textContent.trim() : '';

    const contentElement = document.querySelector('div > div > div');
    let content = '';
    if (contentElement) {
      const children = Array.from(contentElement.children);
      let startIndex = -1;
      for (let i = 0; i < children.length; i++) {
        if (children[i].tagName === 'P' && children[i].textContent.includes(date)) {
          startIndex = i + 1;
          break;
        }
      }

      if (startIndex !== -1) {
        for (let i = startIndex; i < children.length; i++) {
          if (children[i].tagName === 'HR') {
            break;
          }
          content += children[i].outerHTML;
        }
      }
    }

    const markdownContent = turndownService.turndown(content);

    const frontmatter = `---
title: "${title}"
date: "${date}"
---

`;
    const markdown = frontmatter + markdownContent;

    const newFileName = `${postDir}.md`;
    const newFilePath = path.join('src', 'content', 'blog', newFileName);
    await fs.writeFile(newFilePath, markdown);
    console.log(`Migrated ${postDir}`);
  } catch (error) {
    console.error(`Error migrating ${postDir}:`, error.message);
  }
}

async function migrateAllPosts() {
  const files = await fs.readdir('posts');
  const postDirs = [];

  for (const file of files) {
    try {
      const fullPath = path.join('posts', file);
      const stats = await fs.stat(fullPath);
      if (stats.isDirectory() && /^\d+-.+/.test(file)) {
        postDirs.push(file);
      }
    } catch (error) {
      continue;
    }
  }

  for (const postDir of postDirs) {
    await migratePost(postDir);
  }
}

migrateAllPosts();