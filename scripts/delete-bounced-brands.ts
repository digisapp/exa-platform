// Deletes bounced brand outreach contacts by email
// Run with: npx ts-node scripts/delete-bounced-brands.ts
import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BOUNCED_EMAILS = [
  "Press@bouguessa.com",
  "shop@lemlem.com",
  "carola@agenciaguanabara.com.br",
  "shop@hanne-bloch.com",
  "info@cortana.es",
  "customerservice@triumph.com",
  "hello@maryyoung.com",
  "contato@loungerie.com.br",
  "customercare@elomilingerie.com",
  "dropmealime@fruitybooty.co.uk",
  "pressrequest@heist-studios.com",
  "madrid@andressarda.com",
  "customerservice@opaak.de",
  "chantelle@chantelle.com",
  "nicole.colaco@chicos.com",
  "prs@coyuchi.com",
  "press@lilysilk.com",
  "hello@printfresh.com",
  "hello@aybl.com",
  "sharon.barbano@saucony.com",
  "press@allbirds.com",
  "press@rhone.com",
  "carbon38@accentprojects.co",
  "dcortes@dolores-cortes.com",
  "ml@paindesucre.com",
  "hello@andreaiyamah.com",
  "hello@natashatonic.com",
  "customerservice@toripraverswimwear.com",
  "contactus@riotswim.com",
  "contact@leset.com",
  "pr@camilla.com",
  "orders@flookthelabel.com",
  "holly@cultgaia.com",
  "info@sundiaswimwear.com",
  "info@peixotowear.com",
  "info@hankypanky.com",
  "hi@negativeunderwear.com",
  "lisa.chavy@li-vy.com",
  "support@gooseberryintimates.com",
  "customercare@agentprovocateur.com",
  "press@stellamccartney.com",
  "ingola.metz@wolford.com",
  "press@thirdlove.com",
  "press@wearlively.com",
  "info@zemraswim.com",
  "info@azulu.com",
  "info@vixpaulahermanny.com",
  "info@lahanaswim.com",
  "hello@modaminx.com",
  "hello@marsthelabel.com",
  "hello@saltymermaid.com",
  "info@sinesiakarol.com",
  "hello@rhythmlivin.com",
  "customerservice@halebob.com",
  "customerservice@natori.com",
  "customercare@shan.ca",
  "frankchesska@cupshe.com",
  "customerservice@normakamali.com",
  "customerservice@solidandstriped.com",
  "servicioalcliente@aguabendita.com",
  "info@ohpolly.com",
  "customercare@zimmermann.com",
  "support@mondayswimwear.com",
  "info@acacia.co",
  "press@beachbunnyswimwear.com",
  "paulinam@maaji.co",
].map(e => e.toLowerCase());

async function main() {
  console.log(`Deleting ${BOUNCED_EMAILS.length} bounced contacts...`);

  const { data, error } = await supabase
    .from("brand_outreach_contacts")
    .delete()
    .in("email", BOUNCED_EMAILS)
    .select("id, brand_name, email");

  if (error) {
    console.error("Delete error:", error);
    process.exit(1);
  }

  console.log(`\nDeleted ${data?.length ?? 0} contacts:`);
  data?.forEach(c => console.log(`  ✓ ${c.brand_name} <${c.email}>`));

  const notFound = BOUNCED_EMAILS.filter(
    e => !data?.some(c => c.email.toLowerCase() === e)
  );
  if (notFound.length > 0) {
    console.log(`\nNot found in DB (${notFound.length}):`);
    notFound.forEach(e => console.log(`  - ${e}`));
  }
}

main().catch(console.error);
