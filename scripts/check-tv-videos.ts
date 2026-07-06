/**
 * Sweep the EXA TV catalog for dead YouTube videos (deleted or private).
 * Dead videos render as broken grey tiles on /tv — run this occasionally
 * and remove any flagged entries from src/lib/tv-videos.ts.
 * Run: npx tsx scripts/check-tv-videos.ts
 */
import { TV_VIDEOS } from "../src/lib/tv-videos";

async function checkVideo(youtubeId: string): Promise<number> {
  const res = await fetch(
    `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${youtubeId}&format=json`
  );
  return res.status;
}

async function main() {
  console.log(`Checking ${TV_VIDEOS.length} videos…`);
  const dead: { id: string; youtubeId: string; title: string; status: number }[] = [];

  // Small batches to stay polite with YouTube's oEmbed endpoint.
  const BATCH = 10;
  for (let i = 0; i < TV_VIDEOS.length; i += BATCH) {
    const batch = TV_VIDEOS.slice(i, i + BATCH);
    const statuses = await Promise.all(batch.map((v) => checkVideo(v.youtubeId)));
    batch.forEach((v, j) => {
      if (statuses[j] !== 200) {
        dead.push({ id: v.id, youtubeId: v.youtubeId, title: v.title, status: statuses[j] });
      }
    });
    process.stdout.write(`\r${Math.min(i + BATCH, TV_VIDEOS.length)}/${TV_VIDEOS.length}`);
  }
  console.log();

  if (dead.length === 0) {
    console.log("All videos are live.");
    return;
  }
  console.log(`\n${dead.length} dead video(s) — remove from src/lib/tv-videos.ts:`);
  for (const v of dead) {
    console.log(`  id ${v.id} (HTTP ${v.status}) ${v.youtubeId} — ${v.title}`);
  }
  process.exitCode = 1;
}

main();
