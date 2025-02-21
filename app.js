import { htmlToMarkdown } from "webforai";
import { loadHtml } from "webforai/loaders/playwright";
import { chromium } from "playwright";
import fs from 'fs';
import path from 'path';

const url = "https://www.emergencyplumbersca.com";

// Extract domain from URL
const urlObj = new URL(url);
const domain = urlObj.hostname.replace('www.', ''); // Removes www. if present

// Create output directory based on domain
// const outputDir = path.join(__dirname, 'screenshots', domain);
const outputDir = `./${domain}`;
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function main() {
  try {
    // Load html from url
    const html = await loadHtml(url);

    // Convert html to markdown and save to file
    const markdown = htmlToMarkdown(html, { baseUrl: url });
    const mdPath = path.join(outputDir, 'page.md');
    fs.writeFileSync(mdPath, markdown);
    console.log(`Saved markdown to ${mdPath}`);

    // Launch browser for screenshot
    const browser = await chromium.launch();
    const page = await browser.newPage();

    // Take full-page screenshot and save it
    await page.goto(url);
    const screenshotPath = path.join(outputDir, `screenshot.png`);
    await page.screenshot({ 
      path: screenshotPath,
      fullPage: true 
    });
    console.log(`Saved screenshot to ${screenshotPath}`);

    await browser.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

main().catch(console.error);
