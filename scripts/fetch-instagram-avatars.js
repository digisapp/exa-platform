#!/usr/bin/env node

/**
 * Instagram Profile Picture Fetcher
 *
 * Fetches Instagram profile pictures for models who have instagram_name but no avatar.
 * Run slowly to avoid Instagram rate limiting.
 *
 * Usage: node scripts/fetch-instagram-avatars.js
 *
 * Options:
 *   --limit=N     Only process N models (default: 10)
 *   --delay=N     Delay between requests in seconds (default: 8)
 *   --dry-run     Don't actually update database, just show what would happen
 */

const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const http = require('http');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Parse command line arguments
const args = process.argv.slice(2);
const getArg = (name, defaultValue) => {
  const arg = args.find(a => a.startsWith(`--${name}=`));
  return arg ? arg.split('=')[1] : defaultValue;
};

const LIMIT = parseInt(getArg('limit', '10'));
const DELAY_SECONDS = parseInt(getArg('delay', '8'));
const DRY_RUN = args.includes('--dry-run');

// Utility to sleep
const sleep = (seconds) => new Promise(resolve => setTimeout(resolve, seconds * 1000));

// Fetch a URL and return the response body
function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;

    const request = client.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive',
      }
    }, (response) => {
      // Handle redirects
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        fetchUrl(response.headers.location).then(resolve).catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }

      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => resolve(data));
      response.on('error', reject);
    });

    request.on('error', reject);
    request.setTimeout(30000, () => {
      request.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

// Download image as buffer
function downloadImage(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;

    const request = client.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      }
    }, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        downloadImage(response.headers.location).then(resolve).catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }

      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', reject);
    });

    request.on('error', reject);
    request.setTimeout(30000, () => {
      request.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

// Extract Instagram profile picture URL from page HTML
function extractProfilePicUrl(html) {
  // Try HD version FIRST (highest quality ~320x320 or higher)
  const hdMatch = html.match(/"profile_pic_url_hd":"([^"]+)"/);
  if (hdMatch) {
    return hdMatch[1].replace(/\\u0026/g, '&').replace(/\\/g, '');
  }

  // Try profile_pic_url from JSON (medium quality)
  const picMatch = html.match(/"profile_pic_url":"([^"]+)"/);
  if (picMatch) {
    return picMatch[1].replace(/\\u0026/g, '&').replace(/\\/g, '');
  }

  // Fall back to og:image meta tag (often lower quality)
  const ogImageMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
  if (ogImageMatch) {
    return ogImageMatch[1].replace(/&amp;/g, '&');
  }

  return null;
}

// Get Instagram profile picture URL
async function getInstagramProfilePic(username) {
  // Clean username (remove @ and any URL parts)
  username = username.replace('@', '').replace('https://instagram.com/', '').replace('https://www.instagram.com/', '').split('/')[0].trim();

  if (!username) return null;

  // Try multiple approaches
  const approaches = [
    // Approach 1: Web profile with different user agent
    async () => {
      const url = `https://www.instagram.com/${username}/`;
      const html = await fetchUrlWithAgent(url, 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1');
      return extractProfilePicUrl(html);
    },
    // Approach 2: Try i.instagram.com
    async () => {
      const url = `https://i.instagram.com/api/v1/users/web_profile_info/?username=${username}`;
      const response = await fetchUrlWithAgent(url, 'Instagram 76.0.0.15.395 Android');
      const data = JSON.parse(response);
      return data?.data?.user?.profile_pic_url_hd || data?.data?.user?.profile_pic_url;
    },
  ];

  for (const approach of approaches) {
    try {
      const result = await approach();
      if (result) return result;
    } catch (e) {
      // Try next approach
    }
  }

  return null;
}

// Fetch URL with custom user agent
function fetchUrlWithAgent(url, userAgent) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;

    const request = client.get(url, {
      headers: {
        'User-Agent': userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'X-IG-App-ID': '936619743392459',
      }
    }, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        fetchUrlWithAgent(response.headers.location, userAgent).then(resolve).catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }

      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => resolve(data));
      response.on('error', reject);
    });

    request.on('error', reject);
    request.setTimeout(30000, () => {
      request.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

// Upload image to Supabase storage
async function uploadToSupabase(imageBuffer, modelId) {
  const fileName = `${modelId}-instagram-${Date.now()}.jpg`;

  const { data, error } = await supabase.storage
    .from('profile-pictures')
    .upload(fileName, imageBuffer, {
      contentType: 'image/jpeg',
      upsert: true
    });

  if (error) {
    throw error;
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('profile-pictures')
    .getPublicUrl(fileName);

  return urlData.publicUrl;
}

// Main function
async function main() {
  console.log('Instagram Profile Picture Fetcher');
  console.log('==================================');
  console.log(`Limit: ${LIMIT} models`);
  console.log(`Delay: ${DELAY_SECONDS} seconds between requests`);
  console.log(`Dry run: ${DRY_RUN}`);
  console.log('');

  // Fetch models with instagram but no avatar
  console.log('Fetching models without avatars...');

  const { data: models, error } = await supabase
    .from('models')
    .select('id, username, first_name, instagram_name, profile_photo_url')
    .not('instagram_name', 'is', null)
    .neq('instagram_name', '')
    .or('profile_photo_url.is.null,profile_photo_url.eq.')
    .limit(LIMIT);

  if (error) {
    console.error('Error fetching models:', error.message);
    process.exit(1);
  }

  console.log(`Found ${models.length} models with Instagram but no avatar\n`);

  if (models.length === 0) {
    console.log('No models to process. Done!');
    return;
  }

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    const progress = `[${i + 1}/${models.length}]`;

    console.log(`${progress} Processing: ${model.first_name} (@${model.instagram_name})`);

    // Get Instagram profile pic
    const picUrl = await getInstagramProfilePic(model.instagram_name);

    if (!picUrl) {
      console.log(`  ❌ Could not find profile picture`);
      failCount++;
    } else {
      console.log(`  ✓ Found profile picture`);

      if (DRY_RUN) {
        console.log(`  [DRY RUN] Would download and upload image`);
        successCount++;
      } else {
        try {
          // Download the image
          console.log(`  Downloading image...`);
          const imageBuffer = await downloadImage(picUrl);

          // Upload to Supabase
          console.log(`  Uploading to Supabase...`);
          const publicUrl = await uploadToSupabase(imageBuffer, model.id);

          // Update model record
          console.log(`  Updating model record...`);
          const { error: updateError } = await supabase
            .from('models')
            .update({ profile_photo_url: publicUrl })
            .eq('id', model.id);

          if (updateError) {
            throw updateError;
          }

          console.log(`  ✅ Success! Avatar updated`);
          successCount++;
        } catch (err) {
          console.log(`  ❌ Error: ${err.message}`);
          failCount++;
        }
      }
    }

    // Delay before next request (unless last one)
    if (i < models.length - 1) {
      console.log(`  Waiting ${DELAY_SECONDS} seconds...\n`);
      await sleep(DELAY_SECONDS);
    }
  }

  console.log('\n==================================');
  console.log('Summary:');
  console.log(`  ✅ Success: ${successCount}`);
  console.log(`  ❌ Failed: ${failCount}`);
  console.log('==================================');
}

main().catch(console.error);
