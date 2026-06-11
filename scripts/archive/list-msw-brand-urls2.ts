import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const NAMES = ["ATLAS","Anju Blanco","Atlantic Beach","BE SWIM","BELLERIA","BON KINI","Beijo Baby","Bella D Amour","Berry Beachy","Blossom Fit","CAPRISTAN","COCO SOLEIL","EXA Swim","Gigizara","Goalden SWIMWEAR","Huneys","KING THONG","LEO SWIM","Lauren Swim","Lint Label","Mariella Swim","Meduza","O NIKI BIKINIS","PIURI SWIM","Pia Bolte","Quiala Collection","SHERBERT LEMONS","Sabana Swim","Serpent Swim","SugarBush Bikinis","VEVE SWIM","Yesenia Swimwear","AKALO"];

async function main() {
  // First, check all columns of brands
  const { data: sample } = await supabase.from("brands").select("*").limit(1);
  if (sample && sample[0]) {
    console.log("BRAND COLUMNS:", Object.keys(sample[0]).join(", "));
    console.log();
  }

  for (const name of NAMES) {
    const cleaned = name.replace(/\s+/g, ' ').trim();
    const { data: rows } = await supabase
      .from("brands")
      .select("company_name, username, website, instagram_handle")
      .or(`company_name.ilike.%${cleaned}%,username.ilike.%${cleaned.replace(/\s/g,'').toLowerCase()}%`);
    if (rows && rows.length > 0) {
      console.log(`${name}:`);
      for (const r of rows) {
        console.log(`  - ${r.company_name} | username=${r.username} | site=${r.website} | ig=${r.instagram_handle}`);
      }
    } else {
      console.log(`${name}: NOT FOUND`);
    }
  }
}
main().catch(e => { console.error(e); process.exit(1); });
