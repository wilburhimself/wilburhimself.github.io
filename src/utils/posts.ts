import fs from 'fs/promises';
import path from 'path';

export interface Post {
  slug: string;
  title: string;
  date: string;
  content: string;
  excerpt?: string;
}

// Function to extract content from the existing HTML files
export async function extractPostContent(htmlContent: string, slug: string): Promise<{title: string, date: string, content: string, excerpt: string}> {
  // Extract title
  const titleMatch = htmlContent.match(/<title>([^<]+)<\/title>/i) || 
                    htmlContent.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  const title = titleMatch ? titleMatch[1].replace(' — Wilbur Suero', '').trim() : 'Untitled';
  
  // Extract date
  const dateMatch = htmlContent.match(/<p[^>]*style="[^"]*font-size:0\.83255rem[^"]*"[^>]*>([^<]+)<\/p>/i);
  const date = dateMatch ? dateMatch[1].trim() : '';
  
  // Extract content (everything between the date paragraph and the HR tag or navigation)
  const contentStart = dateMatch ? htmlContent.indexOf(dateMatch[0]) + dateMatch[0].length : 0;
  const contentEndTag = htmlContent.indexOf('<hr', contentStart);
  const navStart = htmlContent.indexOf('<ul style="display:flex', contentStart);
  
  let contentEndPos = contentEndTag;
  if (navStart > 0 && (contentEndPos === -1 || navStart < contentEndPos)) {
    contentEndPos = navStart;
  }
  
  const content = contentEndPos > contentStart ? 
    htmlContent.substring(contentStart, contentEndPos) : 
    htmlContent.substring(contentStart);
  
  // Create excerpt from the first paragraph
  const firstParaMatch = content.match(/<p[^>]*>(.*?)<\/p>/i);
  const excerpt = firstParaMatch ? firstParaMatch[1].replace(/<[^>]*>/g, '').substring(0, 160) + '...' : '';
  
  return { title, date, content, excerpt };
}

export async function getAllPosts(): Promise<Post[]> {
  // Get all directories that match the pattern [0-9]+-* from the posts directory
  try {
    const files = await fs.readdir('posts');
    const postDirs = [];
    
    // Use a for...of loop to properly handle async operations
    for (const file of files) {
      try {
        const fullPath = path.join('posts', file);
        const stats = await fs.stat(fullPath);
        if (stats.isDirectory() && /^[0-9]+-.+/.test(file)) {
          postDirs.push(file);
        }
      } catch (error) {
        // Ignore files that cause errors
        continue;
      }
    }
    
    // Sort posts by slug to maintain chronological order
    const sortedPostDirs = postDirs.sort();
    
    const posts = [];
    
    for (const slug of sortedPostDirs) {
      try {
        const htmlPath = path.join('posts', slug, 'index.html');
        const htmlContent = await fs.readFile(htmlPath, 'utf-8');
        const { title, date, content, excerpt } = await extractPostContent(htmlContent, slug);
        posts.push({ slug, title, date, content, excerpt });
      } catch (error) {
        console.error(`Error reading post ${slug}:`, error);
        // Add a placeholder post if we can't read the file
        posts.push({
          slug,
          title: slug.replace(/[0-9]+-/, '').replace(/-/g, ' '),
          date: 'Unknown date',
          content: '<p>Content not available.</p>',
          excerpt: 'Content not available.'
        });
      }
    }
    
    return posts;
  } catch (error) {
    console.error('Error reading posts directory:', error);
    return [];
  }
}

export async function getPostBySlug(slug: string): Promise<Post | undefined> {
  try {
    const htmlPath = path.join('posts', slug, 'index.html');
    const htmlContent = await fs.readFile(htmlPath, 'utf-8');
    const { title, date, content, excerpt } = await extractPostContent(htmlContent, slug);
    return { slug, title, date, content, excerpt };
  } catch (error) {
    console.error(`Error reading post ${slug}:`, error);
    return undefined;
  }
}