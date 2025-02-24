import { chromium } from "playwright";
import fs from 'fs';
import path from 'path';

// List of URLs to scrape
const urls = [
  "https://www.emergencyplumbersca.com",
  // Add more URLs here
];

// Function to extract business data from a page
async function extractBusinessData(page) {
  return await page.evaluate(() => {
    const getData = (selector, attribute = null) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      return attribute ? element.getAttribute(attribute) : element.textContent.trim();
    };

    // Extract meta tags
    const getMeta = (name) => {
      const meta = document.querySelector(`meta[name="${name}"]`) || 
                  document.querySelector(`meta[property="${name}"]`);
      return meta ? meta.getAttribute('content') : null;
    };

    // Extract business hours
    const getBusinessHours = () => {
      const hoursElements = document.querySelectorAll('[itemtype*="OpeningHoursSpecification"]');
      const hours = {};
      hoursElements.forEach(el => {
        const day = el.querySelector('[itemprop="dayOfWeek"]')?.textContent;
        const opens = el.querySelector('[itemprop="opens"]')?.textContent;
        const closes = el.querySelector('[itemprop="closes"]')?.textContent;
        if (day) hours[day] = { opens, closes };
      });
      return Object.keys(hours).length ? hours : null;
    };

    // Extract services
    const getServices = () => {
      const services = [];
      document.querySelectorAll('ul li, .services a, [class*="service"]')
        .forEach(el => {
          const service = el.textContent.trim();
          if (service && service.length > 3) services.push(service);
        });
      return [...new Set(services)]; // Remove duplicates
    };

    return {
      businessName: getData('h1') || getData('[itemtype*="LocalBusiness"] [itemprop="name"]'),
      logo: getData('[itemtype*="LocalBusiness"] [itemprop="logo"]', 'src') || 
            getData('.logo img', 'src'),
      address: getData('[itemtype*="LocalBusiness"] [itemprop="address"]') ||
              getData('.address'),
      phone: getData('[itemtype*="LocalBusiness"] [itemprop="telephone"]') ||
             getData('.phone') ||
             getData('a[href^="tel:"]'),
      services: getServices(),
      businessHours: getBusinessHours(),
      images: Array.from(document.images).map(img => ({
        src: img.src,
        alt: img.alt
      })),
      meta: {
        description: getMeta('description'),
        keywords: getMeta('keywords'),
        ogTitle: getMeta('og:title'),
        ogDescription: getMeta('og:description')
      }
    };
  });
}

async function scrapeWebsite(url) {
  // Extract domain from URL
  const urlObj = new URL(url);
  const domain = urlObj.hostname.replace('www.', '');
  const outputDir = `./${domain}`;

  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    await page.goto(url);

    // Extract business data
    const businessData = await extractBusinessData(page);

    // Save business data as JSON
    const jsonPath = path.join(outputDir, 'business-data.json');
    fs.writeFileSync(jsonPath, JSON.stringify(businessData, null, 2));
    console.log(`Saved business data to ${jsonPath}`);

    // Take screenshot
    const screenshotPath = path.join(outputDir, 'screenshot.png');
    await page.screenshot({ 
      path: screenshotPath,
      fullPage: true 
    });
    console.log(`Saved screenshot to ${screenshotPath}`);

    return businessData;

  } catch (error) {
    console.error(`Error scraping ${url}:`, error);
    return null;
  } finally {
    await browser.close();
  }
}

async function main() {
  try {
    const results = [];
    
    // Process URLs sequentially to avoid overwhelming the system
    for (const url of urls) {
      console.log(`Processing ${url}...`);
      const result = await scrapeWebsite(url);
      if (result) results.push({ url, data: result });
    }

    // Save aggregate results
    const aggregateDir = './aggregate-data';
    if (!fs.existsSync(aggregateDir)) {
      fs.mkdirSync(aggregateDir);
    }
    
    fs.writeFileSync(
      path.join(aggregateDir, 'all-businesses.json'), 
      JSON.stringify(results, null, 2)
    );
    
    console.log('Completed processing all URLs');
  } catch (error) {
    console.error('Fatal error:', error);
  }
}

main().catch(console.error);
