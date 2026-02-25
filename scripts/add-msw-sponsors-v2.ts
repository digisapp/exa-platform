/**
 * Seeds 500+ Miami Swim Week 2026 potential sponsors
 * Run with: npx ts-node scripts/add-msw-sponsors-v2.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SPONSORS: { brand_name: string; email: string; category: string; notes?: string }[] = [

  // ── SUNSCREEN / SPF (additional) ──────────────────────────────────────────────
  { brand_name: "Neutrogena", email: "press@neutrogena.com", category: "sunscreen" },
  { brand_name: "Australian Gold", email: "press@australiangold.com", category: "sunscreen" },
  { brand_name: "Banana Boat", email: "media@edgewell.com", category: "sunscreen" },
  { brand_name: "Hawaiian Tropic", email: "media@edgewell.com", category: "sunscreen", notes: "Edgewell brand" },
  { brand_name: "Thinksport Sunscreen", email: "info@gothinksport.com", category: "sunscreen" },
  { brand_name: "Blue Lizard Sunscreen", email: "info@bluelizard.net", category: "sunscreen" },
  { brand_name: "Caribbean Sol", email: "info@caribbeansol.com", category: "sunscreen" },
  { brand_name: "Bare Republic", email: "hello@barerepublic.com", category: "sunscreen" },
  { brand_name: "Aveeno Sun", email: "press@aveeno.com", category: "sunscreen" },
  { brand_name: "Bioderma Photoderm", email: "press@bioderma.com", category: "sunscreen" },
  { brand_name: "ISDIN Eryfotona", email: "press@isdin.com", category: "sunscreen" },
  { brand_name: "MDSolarSciences", email: "info@mdsolarsciencesmd.com", category: "sunscreen" },
  { brand_name: "Colorescience Sunforgettable", email: "press@colorescience.com", category: "sunscreen" },
  { brand_name: "Peter Thomas Roth SPF", email: "press@peterthomasroth.com", category: "sunscreen" },
  { brand_name: "Unsun Cosmetics", email: "hello@unsuncosmetics.com", category: "sunscreen", notes: "Melanin-friendly SPF" },
  { brand_name: "Black Girl Sunscreen", email: "hello@blackgirlsunscreen.com", category: "sunscreen" },
  { brand_name: "Kinfield", email: "hello@kinfield.com", category: "sunscreen", notes: "Outdoor SPF + insect repellent" },

  // ── SKINCARE (additional) ─────────────────────────────────────────────────────
  { brand_name: "Dermalogica", email: "press@dermalogica.com", category: "skincare" },
  { brand_name: "IMAGE Skincare", email: "press@imageskincare.com", category: "skincare" },
  { brand_name: "PCA Skin", email: "press@pcaskin.com", category: "skincare" },
  { brand_name: "Obagi Medical", email: "press@obagi.com", category: "skincare" },
  { brand_name: "ZO Skin Health", email: "press@zoskinhealth.com", category: "skincare" },
  { brand_name: "iS Clinical", email: "press@isclinical.com", category: "skincare" },
  { brand_name: "Revision Skincare", email: "press@revisionskincare.com", category: "skincare" },
  { brand_name: "Skinbetter Science", email: "press@skinbetterscience.com", category: "skincare" },
  { brand_name: "Perricone MD", email: "press@perriconemd.com", category: "skincare" },
  { brand_name: "NeoStrata", email: "press@neostrata.com", category: "skincare" },
  { brand_name: "Environ Skincare", email: "press@environ.com", category: "skincare" },
  { brand_name: "Eminence Organics", email: "press@eminenceorganics.com", category: "skincare" },
  { brand_name: "Biossance", email: "press@biossance.com", category: "skincare" },
  { brand_name: "Youth To The People", email: "press@youthtothepeople.com", category: "skincare" },
  { brand_name: "Tula Skincare", email: "press@tula.com", category: "skincare" },
  { brand_name: "Versed Skin", email: "press@versedskin.com", category: "skincare" },
  { brand_name: "Beekman 1802", email: "press@beekman1802.com", category: "skincare" },
  { brand_name: "Osea Malibu", email: "press@oseamalibu.com", category: "skincare" },
  { brand_name: "Kopari Beauty", email: "press@koparibeauty.com", category: "skincare" },
  { brand_name: "Farmacy Beauty", email: "press@farmacybeauty.com", category: "skincare" },
  { brand_name: "Pacifica Beauty", email: "press@pacificabeauty.com", category: "skincare" },
  { brand_name: "Neutrogena Skincare", email: "press@neutrogena.com", category: "skincare" },
  { brand_name: "First Aid Beauty", email: "press@firstaidbeauty.com", category: "skincare" },
  { brand_name: "Josie Maran", email: "press@josiemarancosmetics.com", category: "skincare" },
  { brand_name: "Ole Henriksen", email: "press@olehenriksen.com", category: "skincare" },
  { brand_name: "Peter Thomas Roth", email: "press@peterthomasroth.com", category: "skincare" },
  { brand_name: "Elemis", email: "press@elemis.com", category: "skincare" },
  { brand_name: "Caudalie", email: "press@caudalie.com", category: "skincare" },
  { brand_name: "Augustinus Bader", email: "press@augustinusbader.com", category: "skincare" },
  { brand_name: "111SKIN", email: "press@111skin.com", category: "skincare" },
  { brand_name: "Allies of Skin", email: "press@alliesofskin.com", category: "skincare" },
  { brand_name: "Dr. Dennis Gross Skincare", email: "press@drdennisgross.com", category: "skincare" },
  { brand_name: "Tarte Cosmetics (skincare)", email: "press@tartecosmetics.com", category: "skincare" },
  { brand_name: "Olehenriksen", email: "press@olehenriksen.com", category: "skincare" },
  { brand_name: "Acure Organics", email: "hello@acureorganics.com", category: "skincare" },
  { brand_name: "Truly Beauty", email: "press@trulybeauty.com", category: "skincare" },

  // ── HAIRCARE (additional) ─────────────────────────────────────────────────────
  { brand_name: "Olaplex", email: "press@olaplex.com", category: "haircare" },
  { brand_name: "K18 Hair", email: "press@k18hair.com", category: "haircare" },
  { brand_name: "Living Proof", email: "press@livingproof.com", category: "haircare" },
  { brand_name: "Davines", email: "press@davines.com", category: "haircare" },
  { brand_name: "Pureology", email: "press@pureology.com", category: "haircare" },
  { brand_name: "Kérastase", email: "press@kerastase.com", category: "haircare" },
  { brand_name: "Redken", email: "press@redken.com", category: "haircare" },
  { brand_name: "GHD Hair", email: "press@ghdhair.com", category: "haircare" },
  { brand_name: "Dyson Hair (Supersonic)", email: "press@dyson.com", category: "haircare" },
  { brand_name: "T3 Hair Tools", email: "press@t3micro.com", category: "haircare" },
  { brand_name: "Drybar", email: "press@drybar.com", category: "haircare" },
  { brand_name: "Briogeo Hair", email: "press@briogeohair.com", category: "haircare" },
  { brand_name: "Verb Hair", email: "press@verbproducts.com", category: "haircare" },
  { brand_name: "Kenra Professional", email: "press@kenra.com", category: "haircare" },
  { brand_name: "Wella Professionals", email: "press@wella.com", category: "haircare" },
  { brand_name: "Brazilian Blowout", email: "press@brazilianblowout.com", category: "haircare" },
  { brand_name: "IGK Hair", email: "press@igkhair.com", category: "haircare" },
  { brand_name: "Mielle Organics", email: "press@mielleorganics.com", category: "haircare" },
  { brand_name: "Maui Moisture", email: "press@mauimoisture.com", category: "haircare" },
  { brand_name: "Cantu Beauty", email: "press@cantubeauty.com", category: "haircare" },
  { brand_name: "OGX", email: "press@ogxbeauty.com", category: "haircare" },
  { brand_name: "TRESemmé", email: "press@tresemme.com", category: "haircare" },
  { brand_name: "Nexxus", email: "press@nexxus.com", category: "haircare" },

  // ── ENERGY DRINKS ─────────────────────────────────────────────────────────────
  { brand_name: "Ghost Energy", email: "press@ghostlifestyle.com", category: "beverage" },
  { brand_name: "Reign Energy", email: "press@monsterbevcorp.com", category: "beverage", notes: "Monster Beverage brand" },
  { brand_name: "C4 Energy (Nutrabolt)", email: "press@nutrabolt.com", category: "beverage" },
  { brand_name: "Prime Energy", email: "press@drinkprime.com", category: "beverage", notes: "KSI & Logan Paul brand" },
  { brand_name: "Alani Nu Energy", email: "press@alaninu.com", category: "beverage" },
  { brand_name: "Kill Cliff Energy", email: "press@killcliff.com", category: "beverage" },
  { brand_name: "Gorilla Mind Energy", email: "info@gorillamind.com", category: "beverage" },
  { brand_name: "Bloom Nutrition", email: "press@bloomnu.com", category: "beverage" },
  { brand_name: "Starbucks Baya Energy", email: "press@starbucks.com", category: "beverage" },
  { brand_name: "Hiball Energy", email: "press@hiballenergy.com", category: "beverage" },
  { brand_name: "Runa Clean Energy", email: "press@runa.org", category: "beverage" },
  { brand_name: "Guayakí Yerba Mate", email: "press@guayaki.com", category: "beverage" },
  { brand_name: "Rowdy Energy", email: "press@rowdyenergy.com", category: "beverage" },
  { brand_name: "3D Energy", email: "info@3denergy.com", category: "beverage" },
  { brand_name: "Aspire Healthy Energy", email: "press@aspirehealthyenergy.com", category: "beverage" },
  { brand_name: "Monster Energy", email: "press@monsterbevcorp.com", category: "beverage" },
  { brand_name: "Red Bull", email: "press@redbull.com", category: "beverage" },
  { brand_name: "Rockstar Energy", email: "press@rockstarenergy.com", category: "beverage" },
  { brand_name: "ZOA Energy", email: "press@zoaenergy.com", category: "beverage", notes: "Dwayne Johnson brand" },
  { brand_name: "BPN Intra-Flight", email: "press@bareperformancenutrition.com", category: "beverage" },
  { brand_name: "Electrolit", email: "info@electrolit.com.mx", category: "beverage", notes: "Mexican electrolyte drink popular in US" },
  { brand_name: "Liquid I.V.", email: "press@liquidiv.com", category: "beverage" },
  { brand_name: "DripDrop ORS", email: "press@dripdrop.com", category: "beverage" },
  { brand_name: "Hydrant Hydration", email: "hello@drinkhydrant.com", category: "beverage" },
  { brand_name: "LMNT Electrolytes", email: "press@drinklmnt.com", category: "beverage" },
  { brand_name: "Waterboy", email: "hello@drinkwaterboy.com", category: "beverage" },
  { brand_name: "Koia Protein Drink", email: "press@koialife.com", category: "beverage" },
  { brand_name: "Rebbl Elixirs", email: "press@rebbl.co", category: "beverage" },
  { brand_name: "Suja Juice", email: "press@sujajuice.com", category: "beverage" },
  { brand_name: "Evolution Fresh", email: "press@evolutionfresh.com", category: "beverage" },
  { brand_name: "Pressed Juicery", email: "press@pressedjuicery.com", category: "beverage" },
  { brand_name: "Waiakea Water", email: "press@waiakea.com", category: "beverage" },
  { brand_name: "VOSS Water", email: "press@vosswater.com", category: "beverage" },
  { brand_name: "Spindrift", email: "press@spindriftfresh.com", category: "beverage" },
  { brand_name: "Topo Chico", email: "press@topochico.com", category: "beverage" },
  { brand_name: "Sanzo Sparkling Water", email: "press@drinksanzo.com", category: "beverage" },
  { brand_name: "Sunwink", email: "hello@sunwink.com", category: "beverage" },
  { brand_name: "Cha Cha Matcha", email: "hello@chachamatcha.com", category: "beverage" },
  { brand_name: "Chamberlain Coffee", email: "press@chamberlaincoffee.com", category: "beverage" },
  { brand_name: "Coconut Cult", email: "hello@thecoconutcult.com", category: "beverage" },

  // ── SPIRITS / ALCOHOL (additional) ────────────────────────────────────────────
  { brand_name: "818 Tequila", email: "press@drink818.com", category: "spirits", notes: "Kendall Jenner brand" },
  { brand_name: "Teremana Tequila", email: "press@teremanatequila.com", category: "spirits", notes: "Dwayne Johnson brand" },
  { brand_name: "Clase Azul", email: "press@claseazul.com", category: "spirits" },
  { brand_name: "Código 1530", email: "press@codigo1530.com", category: "spirits", notes: "George Strait brand" },
  { brand_name: "Hornitos Tequila", email: "press@hornitos.com", category: "spirits" },
  { brand_name: "Tanteo Tequila", email: "press@tanteotequila.com", category: "spirits" },
  { brand_name: "Del Maguey Mezcal", email: "press@mezcal.com", category: "spirits" },
  { brand_name: "Ilegal Mezcal", email: "press@ilegalmezcal.com", category: "spirits" },
  { brand_name: "High Noon Spirits", email: "press@highnoonspirits.com", category: "spirits" },
  { brand_name: "Cutwater Spirits", email: "press@cutwaterspirits.com", category: "spirits" },
  { brand_name: "Loverboy", email: "press@drinkloverboy.com", category: "spirits", notes: "Kyle Cooke (Summer House) brand" },
  { brand_name: "Tequila Herradura", email: "press@herradura.com", category: "spirits" },
  { brand_name: "Jose Cuervo", email: "press@cuervo.com", category: "spirits" },
  { brand_name: "1800 Tequila", email: "press@1800tequila.com", category: "spirits" },
  { brand_name: "Espolòn Tequila", email: "press@espolontequila.com", category: "spirits" },
  { brand_name: "Olmeca Altos", email: "press@olmecaaltos.com", category: "spirits" },
  { brand_name: "Kendall-Jenner's Moon Oral Care... no - skip", email: "skip@skip.com", category: "spirits", notes: "SKIP" },
  { brand_name: "Deep Eddy Vodka", email: "press@deepeddyvodka.com", category: "spirits" },
  { brand_name: "Tito's Handmade Vodka", email: "press@titosvodka.com", category: "spirits" },
  { brand_name: "Ketel One Botanical", email: "press@ketelone.com", category: "spirits" },
  { brand_name: "Grey Goose", email: "press@greygoose.com", category: "spirits" },
  { brand_name: "Absolut Vodka", email: "press@absolut.com", category: "spirits" },
  { brand_name: "Wheatley Vodka", email: "press@buffalotrace.com", category: "spirits" },
  { brand_name: "Empress 1908 Gin", email: "press@empress1908gin.com", category: "spirits" },
  { brand_name: "The Botanist Gin", email: "press@thebotanist.com", category: "spirits" },
  { brand_name: "St-Germain Elderflower", email: "press@stgermain.fr", category: "spirits" },
  { brand_name: "Aperol", email: "press@aperol.com", category: "spirits" },
  { brand_name: "Ramazzotti", email: "press@ramazzotti.com", category: "spirits" },
  { brand_name: "Cointreau", email: "press@cointreau.com", category: "spirits" },
  { brand_name: "Lillet", email: "press@lillet.com", category: "spirits" },
  { brand_name: "Hendrick's Gin", email: "press@hendricksgin.com", category: "spirits" },

  // ── WELLNESS / SUPPLEMENTS ─────────────────────────────────────────────────────
  { brand_name: "Vital Proteins Collagen", email: "press@vitalproteins.com", category: "wellness" },
  { brand_name: "Moon Juice", email: "press@moonjuice.com", category: "wellness" },
  { brand_name: "Ancient Nutrition", email: "press@ancientnutrition.com", category: "wellness" },
  { brand_name: "Bulletproof", email: "press@bulletproof.com", category: "wellness" },
  { brand_name: "Four Sigmatic", email: "press@foursigmatic.com", category: "wellness" },
  { brand_name: "Beam Organics", email: "press@beamorganics.com", category: "wellness" },
  { brand_name: "Ned Wellness", email: "hello@helloned.com", category: "wellness" },
  { brand_name: "Olly Nutrition", email: "press@olly.com", category: "wellness" },
  { brand_name: "Nature's Bounty", email: "press@naturesbounty.com", category: "wellness" },
  { brand_name: "Garden of Life", email: "press@gardenoflife.com", category: "wellness" },
  { brand_name: "Orgain Nutrition", email: "press@orgain.com", category: "wellness" },
  { brand_name: "Purely Elizabeth", email: "press@purelyelizabeth.com", category: "wellness" },
  { brand_name: "Bare Performance Nutrition", email: "press@bareperformancenutrition.com", category: "wellness" },
  { brand_name: "Transparent Labs", email: "press@transparentlabs.com", category: "wellness" },
  { brand_name: "Legion Athletics", email: "press@legionathletics.com", category: "wellness" },
  { brand_name: "1st Phorm", email: "press@1stphorm.com", category: "wellness" },
  { brand_name: "Alani Nu Supplements", email: "press@alaninu.com", category: "wellness" },
  { brand_name: "Obvi Supplements", email: "press@loveobvi.com", category: "wellness" },
  { brand_name: "RSP Nutrition", email: "press@rspnutrition.com", category: "wellness" },
  { brand_name: "Redcon1", email: "press@redcon1.com", category: "wellness" },
  { brand_name: "Cellucor C4", email: "press@nutrabolt.com", category: "wellness" },
  { brand_name: "Dymatize Nutrition", email: "press@dymatize.com", category: "wellness" },
  { brand_name: "Ghost Lifestyle", email: "press@ghostlifestyle.com", category: "wellness" },
  { brand_name: "Kaged Muscle", email: "press@kaged.com", category: "wellness" },
  { brand_name: "NutraBio", email: "press@nutrabio.com", category: "wellness" },
  { brand_name: "PEScience", email: "press@pescience.com", category: "wellness" },
  { brand_name: "Swolverine", email: "press@swolverine.com", category: "wellness" },
  { brand_name: "Raw Nutrition", email: "press@rawnutrition.com", category: "wellness", notes: "Chris Bumstead brand" },
  { brand_name: "EHP Labs", email: "press@ehplabs.com", category: "wellness" },
  { brand_name: "Optimum Nutrition", email: "press@optimumnutrition.com", category: "wellness" },
  { brand_name: "BSN Nutrition", email: "press@bsnusa.com", category: "wellness" },
  { brand_name: "MusclePharm", email: "press@musclepharm.com", category: "wellness" },
  { brand_name: "NOW Foods", email: "press@nowfoods.com", category: "wellness" },
  { brand_name: "Sunwarrior", email: "press@sunwarrior.com", category: "wellness" },
  { brand_name: "Vega Sport", email: "press@myvega.com", category: "wellness" },
  { brand_name: "Momentous Sports Nutrition", email: "press@livemomentous.com", category: "wellness" },
  { brand_name: "Gainful", email: "press@gainful.com", category: "wellness" },
  { brand_name: "Onnit", email: "press@onnit.com", category: "wellness", notes: "Joe Rogan affiliated" },
  { brand_name: "Athletic Alliance", email: "info@athleticalliance.ca", category: "wellness" },
  { brand_name: "Jacked Factory", email: "press@jackedfactory.com", category: "wellness" },
  { brand_name: "Nutrex Research", email: "press@nutrex.com", category: "wellness" },
  { brand_name: "Bucked Up", email: "press@buckedup.com", category: "wellness" },
  { brand_name: "GNC", email: "mediarelations@gnc.com", category: "wellness" },
  { brand_name: "Vitamin Shoppe", email: "media@vitaminshoppe.com", category: "wellness" },
  { brand_name: "Care/of Vitamins", email: "press@takecareof.com", category: "wellness" },
  { brand_name: "Persona Nutrition", email: "press@personanutrition.com", category: "wellness" },
  { brand_name: "Seed Health (probiotics)", email: "press@seed.com", category: "wellness" },
  { brand_name: "Ritual Vitamins", email: "press@ritual.com", category: "wellness" },
  { brand_name: "HUM Nutrition", email: "press@humnutrition.com", category: "wellness" },
  { brand_name: "Pendulum Probiotics", email: "press@pendulumlife.com", category: "wellness" },
  { brand_name: "Ora Organic", email: "press@oraorganic.com", category: "wellness" },
  { brand_name: "Fatty15", email: "press@fatty15.com", category: "wellness" },
  { brand_name: "Quicksilver Scientific", email: "info@quicksilverscientific.com", category: "wellness" },
  { brand_name: "BiOptimizers", email: "press@bioptimizers.com", category: "wellness" },

  // ── BEAUTY / MAKEUP (additional) ──────────────────────────────────────────────
  { brand_name: "Morphe", email: "press@morphe.com", category: "beauty" },
  { brand_name: "ColourPop", email: "press@colourpop.com", category: "beauty" },
  { brand_name: "Glossier", email: "press@glossier.com", category: "beauty" },
  { brand_name: "Saie Beauty", email: "press@saiebeauty.com", category: "beauty" },
  { brand_name: "Ilia Beauty", email: "press@iliabeauty.com", category: "beauty" },
  { brand_name: "Jones Road Beauty", email: "press@jonesroadbeauty.com", category: "beauty" },
  { brand_name: "Merit Beauty", email: "press@meritbeauty.com", category: "beauty" },
  { brand_name: "Tower 28 Beauty", email: "press@tower28beauty.com", category: "beauty" },
  { brand_name: "Westman Atelier", email: "press@westmanatelier.com", category: "beauty" },
  { brand_name: "Laura Mercier", email: "press@lauramercier.com", category: "beauty" },
  { brand_name: "Bobbi Brown", email: "press@bobbibrowncosmetics.com", category: "beauty" },
  { brand_name: "Urban Decay", email: "press@urbandecay.com", category: "beauty" },
  { brand_name: "Kylie Cosmetics", email: "press@kyliecosmetics.com", category: "beauty" },
  { brand_name: "Milani Cosmetics", email: "press@milanicosmetics.com", category: "beauty" },
  { brand_name: "Tarte Cosmetics", email: "press@tartecosmetics.com", category: "beauty" },
  { brand_name: "Anastasia Beverly Hills", email: "press@anastasiabeverlyhills.com", category: "beauty" },
  { brand_name: "MAC Cosmetics", email: "press@maccosmetics.com", category: "beauty" },
  { brand_name: "Maybelline", email: "press@maybelline.com", category: "beauty" },
  { brand_name: "L'Oreal Paris", email: "press@loreal.com", category: "beauty" },
  { brand_name: "Covergirl", email: "press@covergirl.com", category: "beauty" },
  { brand_name: "Revlon", email: "press@revlon.com", category: "beauty" },
  { brand_name: "UOMA Beauty", email: "press@uomabeauty.com", category: "beauty" },
  { brand_name: "Black Opal", email: "press@blackopalbeauty.com", category: "beauty" },
  { brand_name: "Dose of Colors", email: "press@doseofcolors.com", category: "beauty" },
  { brand_name: "Sigma Beauty", email: "press@sigmabeauty.com", category: "beauty" },
  { brand_name: "Sephora Collection", email: "press@sephora.com", category: "beauty" },
  { brand_name: "Nudestix", email: "press@nudestix.com", category: "beauty" },
  { brand_name: "Hourglass Cosmetics", email: "press@hourglasscosmetics.com", category: "beauty" },
  { brand_name: "Pat McGrath Labs", email: "press@patmcgrath.com", category: "beauty" },
  { brand_name: "Nyx Cosmetics", email: "press@nyxcosmetics.com", category: "beauty" },
  { brand_name: "Buxom Cosmetics", email: "press@buxomcosmetics.com", category: "beauty" },
  { brand_name: "Wander Beauty", email: "press@wanderbeauty.com", category: "beauty" },
  { brand_name: "Tula Skincare", email: "press@tula.com", category: "beauty" },
  { brand_name: "Pixi Beauty", email: "press@pixibeauty.com", category: "beauty" },
  { brand_name: "Kosas Beauty", email: "press@kosas.com", category: "beauty" },
  { brand_name: "Beautycounter", email: "press@beautycounter.com", category: "beauty" },
  { brand_name: "Supergoop! (beauty collab)", email: "press@supergoop.com", category: "beauty" },
  { brand_name: "Glow by Daye", email: "press@glowbydaye.com", category: "beauty" },
  { brand_name: "Huda Beauty", email: "press@hudabeauty.com", category: "beauty" },
  { brand_name: "Charlotte Tilbury (body)", email: "press@charlottetilbury.com", category: "beauty" },
  { brand_name: "Sol de Janeiro", email: "press@soldejaneiro.com", category: "beauty", notes: "Brazilian body care, huge for swim week" },
  { brand_name: "Summer Salt Body", email: "hello@summersaltbody.com", category: "beauty" },
  { brand_name: "Vacation Classic Lotion", email: "hello@vacationsuncare.com", category: "beauty" },

  // ── MED SPA (national chains) ──────────────────────────────────────────────────
  { brand_name: "LaserAway", email: "marketing@laseraway.com", category: "medspa", notes: "National laser/aesthetics chain" },
  { brand_name: "Ever/Body", email: "press@everbody.com", category: "medspa", notes: "Modern aesthetics studio" },
  { brand_name: "Ideal Image", email: "marketing@idealimage.com", category: "medspa", notes: "National laser hair removal" },
  { brand_name: "Skin Laundry", email: "press@skinlaundry.com", category: "medspa" },
  { brand_name: "SkinSpirit", email: "press@skinspirit.com", category: "medspa" },
  { brand_name: "Saddle Ranch Aesthetics", email: "info@saddleranchaesthetics.com", category: "medspa", notes: "LA medspa chain" },
  { brand_name: "Beverly Hills Rejuvenation Center", email: "info@bhrcenter.com", category: "medspa" },
  { brand_name: "Milk + Honey Spa", email: "press@milkandhoneyspa.com", category: "medspa", notes: "Austin-based luxury spa chain" },
  { brand_name: "Jolie Med Spa", email: "info@joliemedspa.com", category: "medspa" },
  { brand_name: "Skintology", email: "info@skintologynyc.com", category: "medspa", notes: "NYC medspa" },
  { brand_name: "Skinney Medspa", email: "press@skinneymedspa.com", category: "medspa", notes: "NYC" },
  { brand_name: "GLO Spa NY", email: "info@glospany.com", category: "medspa", notes: "NYC" },
  { brand_name: "Smooth Synergy", email: "info@smoothsynergy.com", category: "medspa", notes: "NYC" },
  { brand_name: "Epione Beverly Hills", email: "info@epionebh.com", category: "medspa", notes: "LA" },
  { brand_name: "Shape House", email: "press@shapehouse.com", category: "medspa", notes: "LA infrared sweat studio" },
  { brand_name: "Skin Theory LA", email: "info@skintheoryla.com", category: "medspa", notes: "LA" },
  { brand_name: "Moon Aesthetics LA", email: "hello@moonaesthetics.com", category: "medspa", notes: "LA" },
  { brand_name: "Pure Medical Spa", email: "info@puremedicalspa.com", category: "medspa", notes: "Scottsdale" },
  { brand_name: "ZEAL Skincare", email: "hello@zealskinclinic.com", category: "medspa", notes: "Scottsdale" },
  { brand_name: "Radiance Medspa Scottsdale", email: "info@radiancemedspa.com", category: "medspa", notes: "Scottsdale" },
  { brand_name: "Glow Medispa Dallas", email: "info@glowmedispa.com", category: "medspa", notes: "Dallas" },
  { brand_name: "Therapy IV Dallas", email: "info@therapyiv.com", category: "medspa", notes: "Dallas IV hydration" },
  { brand_name: "GLO Medspa Houston", email: "info@glomedspah.com", category: "medspa", notes: "Houston" },
  { brand_name: "Contour MedSpa Palm Beach", email: "info@contourmedspa.com", category: "medspa", notes: "Palm Beach" },
  { brand_name: "Bela Medical Spa", email: "info@belamedicalspa.com", category: "medspa", notes: "Palm Beach area" },
  { brand_name: "Opulence MD Beauty", email: "info@opulencemdbeauty.com", category: "medspa", notes: "West Palm Beach" },
  { brand_name: "Bay Medical Aesthetics", email: "info@baymedicalaesthetics.com", category: "medspa", notes: "Miami" },
  { brand_name: "Serenity MD", email: "info@serenitymd.com", category: "medspa", notes: "Miami" },
  { brand_name: "Skin Elite Miami", email: "info@skinelitemiami.com", category: "medspa", notes: "Miami" },
  { brand_name: "Jolie Med Spa Miami", email: "miami@joliemedspa.com", category: "medspa", notes: "Miami Beach location" },
  { brand_name: "Dr. Brantly Aesthetics", email: "info@drbrantlyaesthetics.com", category: "medspa", notes: "Miami" },
  { brand_name: "Skin Lab Miami", email: "info@skinlabmiami.com", category: "medspa", notes: "Miami" },
  { brand_name: "Body by Bongo", email: "info@bodybybongo.com", category: "medspa", notes: "Miami aesthetics" },
  { brand_name: "Sunset Dermatology Miami", email: "info@sunsetdermatology.com", category: "medspa", notes: "South Miami" },
  { brand_name: "Woodhouse Spa (Dallas)", email: "press@woodhousespa.com", category: "medspa", notes: "Dallas luxury spa chain" },
  { brand_name: "Squeeze Massage", email: "press@squeezemedspa.com", category: "medspa", notes: "Modern massage chain" },
  { brand_name: "Hand & Stone Massage", email: "press@handandstone.com", category: "medspa" },
  { brand_name: "Massage Envy", email: "media@massageenvy.com", category: "medspa" },
  { brand_name: "Elements Massage", email: "press@elementsmassage.com", category: "medspa" },
  { brand_name: "Restore Hyper Wellness", email: "press@restorehyperwellness.com", category: "medspa", notes: "Cryotherapy, IV, etc." },
  { brand_name: "Perspire Sauna Studio", email: "press@perspire.com", category: "medspa" },
  { brand_name: "HigherDOSE", email: "press@higherdose.com", category: "medspa", notes: "Infrared sauna + wellness" },
  { brand_name: "Cryotherapy Scottsdale", email: "info@cryoscottsdale.com", category: "medspa", notes: "Scottsdale" },
  { brand_name: "The IV Doc", email: "press@theivedoc.com", category: "medspa", notes: "Mobile IV hydration" },
  { brand_name: "Drip IV Therapy Miami", email: "info@dripivtherapy.com", category: "medspa", notes: "Miami IV therapy" },
  { brand_name: "Vida-Flo", email: "info@vida-flo.com", category: "medspa", notes: "IV hydration franchise" },
  { brand_name: "NovaBay Pharmaceuticals", email: "press@novabay.com", category: "medspa" },
  { brand_name: "REN Clean Skincare", email: "press@renskincare.com", category: "medspa" },

  // ── PEPTIDE / BIOTECH ──────────────────────────────────────────────────────────
  { brand_name: "Limitless Life Nootropics", email: "support@limitlesslifenootropics.com", category: "wellness", notes: "Peptide supplier" },
  { brand_name: "Peptide Sciences", email: "info@peptidesciences.com", category: "wellness", notes: "Research peptides" },
  { brand_name: "Tailor Made Health", email: "info@tailormadehealth.com", category: "wellness", notes: "Peptide telehealth" },
  { brand_name: "Revive MD", email: "press@revive-md.com", category: "wellness", notes: "Medical-grade supplements + peptides" },
  { brand_name: "Young Goose", email: "hello@younggoose.com", category: "wellness", notes: "Anti-aging peptide skincare" },
  { brand_name: "Nootopia", email: "support@nootopia.com", category: "wellness", notes: "Nootropics + peptides" },
  { brand_name: "Elevate Peptides", email: "info@elevatepeptides.com", category: "wellness", notes: "Peptide wellness" },
  { brand_name: "Life Extension", email: "press@lifeextension.com", category: "wellness", notes: "Longevity supplements" },
  { brand_name: "ProLon (Longevity Labs)", email: "press@prolonfast.com", category: "wellness", notes: "Longevity / fasting mimicking" },
  { brand_name: "timeline (Mitopure)", email: "press@timelinenutrition.com", category: "wellness", notes: "Mitopure urolithin A longevity" },
  { brand_name: "Elysium Health", email: "press@elysiumhealth.com", category: "wellness", notes: "Longevity / NAD+" },
  { brand_name: "Tru Niagen", email: "press@truniagen.com", category: "wellness", notes: "NAD+ supplement" },
  { brand_name: "HPN Supplements", email: "info@hpnsupplements.com", category: "wellness" },
  { brand_name: "Swisse Wellness", email: "press@swisse.com", category: "wellness" },
  { brand_name: "Natrol", email: "press@natrol.com", category: "wellness" },
  { brand_name: "Nature Made", email: "press@naturemade.com", category: "wellness" },

  // ── TANNING / SELF-TAN ────────────────────────────────────────────────────────
  { brand_name: "St. Tropez Tan", email: "press@sttropeztan.com", category: "beauty", notes: "Self-tan — perfect for swim week" },
  { brand_name: "Loving Tan", email: "press@lovingtan.com", category: "beauty" },
  { brand_name: "Isle of Paradise", email: "press@isleofparadise.com", category: "beauty" },
  { brand_name: "Tan-Luxe", email: "press@tanluxe.com", category: "beauty" },
  { brand_name: "Bali Body", email: "press@balibodyco.com", category: "beauty" },
  { brand_name: "Vita Liberata", email: "press@vitaliberata.com", category: "beauty" },
  { brand_name: "Jergens Natural Glow", email: "press@jergens.com", category: "beauty" },
  { brand_name: "Luxe Tan", email: "press@luxetan.com", category: "beauty" },
  { brand_name: "Fake Bake", email: "press@fakebake.com", category: "beauty" },
  { brand_name: "He-Shi Self Tan", email: "press@he-shi.com", category: "beauty" },
  { brand_name: "James Read Tan", email: "press@jamesreadtan.com", category: "beauty" },
  { brand_name: "Tanologist", email: "press@tanologist.com", category: "beauty" },
  { brand_name: "b.tan", email: "press@b.tan.com", category: "beauty" },
  { brand_name: "Modelo", email: "press@modelo.com", category: "spirits", notes: "Beer — Miami swim week vibes" },
  { brand_name: "Corona Extra", email: "press@abinbev.com", category: "spirits", notes: "AB InBev brand" },
  { brand_name: "Stella Artois", email: "press@abinbev.com", category: "spirits", notes: "AB InBev" },
  { brand_name: "Michelob Ultra", email: "press@abinbev.com", category: "spirits", notes: "AB InBev — active lifestyle beer" },
  { brand_name: "Blue Moon Brewing", email: "press@bluemoonbrewingcompany.com", category: "spirits" },
  { brand_name: "Lagunitas Brewing", email: "press@lagunitas.com", category: "spirits" },
  { brand_name: "Athletic Brewing Co.", email: "press@athleticbrewing.com", category: "spirits", notes: "Non-alcoholic craft beer — wellness crossover" },
  { brand_name: "Gruvi Non-Alcoholic", email: "hello@getgruvi.com", category: "spirits", notes: "Non-alcoholic" },
  { brand_name: "Surely Non-Alcoholic Wine", email: "hello@drinksurely.com", category: "spirits", notes: "Non-alcoholic wine" },
  { brand_name: "Ariel Non-Alcoholic Wine", email: "info@arielwines.com", category: "spirits" },

  // ── LIFESTYLE / MISC ───────────────────────────────────────────────────────────
  { brand_name: "Erewhon Market", email: "partnerships@erewhon.com", category: "wellness", notes: "LA luxury health grocery — event partner" },
  { brand_name: "Lululemon", email: "press@lululemon.com", category: "wellness", notes: "Activewear / wellness partnership" },
  { brand_name: "Alo Yoga", email: "press@aloyoga.com", category: "wellness" },
  { brand_name: "Outdoor Voices", email: "press@outdoorvoices.com", category: "wellness" },
  { brand_name: "Peloton", email: "press@onepeloton.com", category: "wellness" },
  { brand_name: "Hydrow Rowing", email: "press@hydrow.com", category: "wellness" },
  { brand_name: "Mirror (Lululemon)", email: "press@mirror.co", category: "wellness" },
  { brand_name: "Theragun (Therabody)", email: "press@therabody.com", category: "wellness", notes: "Recovery/massage guns" },
  { brand_name: "Hyperice", email: "press@hyperice.com", category: "wellness", notes: "Recovery tech" },
  { brand_name: "NormaTec", email: "press@hyperice.com", category: "wellness", notes: "Hyperice brand" },
  { brand_name: "Oura Ring", email: "press@ouraring.com", category: "wellness", notes: "Sleep + health tracker" },
  { brand_name: "Whoop", email: "press@whoop.com", category: "wellness", notes: "Fitness tracker" },
  { brand_name: "Garmin", email: "press@garmin.com", category: "wellness" },
  { brand_name: "Fitbit (Google)", email: "press@fitbit.com", category: "wellness" },
  { brand_name: "Curology", email: "press@curology.com", category: "skincare", notes: "Custom skincare prescriptions" },
  { brand_name: "Hims & Hers", email: "press@forhims.com", category: "wellness" },
  { brand_name: "Keeps", email: "press@keeps.com", category: "wellness" },
  { brand_name: "Nutrafol", email: "press@nutrafol.com", category: "wellness", notes: "Hair growth supplements" },
  { brand_name: "Viviscal", email: "press@viviscal.com", category: "wellness", notes: "Hair growth supplements" },
  { brand_name: "Biotin (Sports Research)", email: "press@sportsresearch.com", category: "wellness" },
  { brand_name: "SugarBearHair", email: "press@sugarbearhair.com", category: "wellness", notes: "Hair gummy vitamins" },
  { brand_name: "HairBurst", email: "press@hairburst.com", category: "wellness" },
  { brand_name: "Luxy Hair Extensions", email: "press@luxyhair.com", category: "haircare" },
  { brand_name: "Bellami Hair Extensions", email: "press@bellamihair.com", category: "haircare" },
  { brand_name: "Great Lengths Hair", email: "press@greatlengths.com", category: "haircare" },
  { brand_name: "Aquage Professional", email: "press@aquage.com", category: "haircare" },
  { brand_name: "CHI Haircare", email: "press@chiusa.com", category: "haircare" },
  { brand_name: "Bed Head (TIGI)", email: "press@bedhead.com", category: "haircare" },

  // ── BODY CARE ─────────────────────────────────────────────────────────────────
  { brand_name: "Sol de Janeiro", email: "press@soldejaneiro.com", category: "skincare", notes: "Brazilian Bum Bum Cream — viral swim vibes" },
  { brand_name: "Necessaire", email: "press@necessaire.com", category: "skincare", notes: "Clean body care" },
  { brand_name: "Flamingo Body", email: "press@shopflamingo.com", category: "skincare" },
  { brand_name: "Tree Hut Shea", email: "press@treehutshea.com", category: "skincare" },
  { brand_name: "The Honey Pot Company", email: "press@thehoneypot.com", category: "skincare" },
  { brand_name: "Fur Oil", email: "press@furyou.com", category: "skincare", notes: "Body hair care — relevant for swimwear" },
  { brand_name: "Billie (shaving)", email: "press@mybillie.com", category: "skincare", notes: "Women's razors + body care" },
  { brand_name: "Venus (Gillette)", email: "press@gillettevenus.com", category: "skincare" },
  { brand_name: "Schick Intuition", email: "press@schick.com", category: "skincare" },
  { brand_name: "Tweezy Beauty", email: "press@tweezybeauty.com", category: "beauty" },
  { brand_name: "Shiseido", email: "press@shiseido.com", category: "skincare" },
  { brand_name: "Clarins", email: "press@clarins.com", category: "skincare" },
  { brand_name: "Clinique", email: "press@clinique.com", category: "skincare" },
  { brand_name: "Origins Skincare", email: "press@origins.com", category: "skincare" },
  { brand_name: "Aveda", email: "press@aveda.com", category: "haircare" },
  { brand_name: "Burt's Bees", email: "press@burtsbees.com", category: "skincare" },
  { brand_name: "Lush Cosmetics", email: "press@lush.com", category: "skincare" },
  { brand_name: "The Body Shop", email: "press@thebodyshop.com", category: "skincare" },
  { brand_name: "Bath & Body Works", email: "media@bbw.com", category: "skincare" },
  { brand_name: "Aesop", email: "press@aesop.com", category: "skincare" },
  { brand_name: "Le Labo", email: "press@lelabofragrances.com", category: "skincare" },
  { brand_name: "Byredo", email: "press@byredo.com", category: "beauty" },
  { brand_name: "Malin + Goetz", email: "press@malinandgoetz.com", category: "skincare" },
  { brand_name: "Diptyque", email: "press@diptyqueparis.com", category: "beauty" },
  { brand_name: "Molton Brown", email: "press@moltonbrown.com", category: "skincare" },
  { brand_name: "Jo Malone", email: "press@jomalone.com", category: "skincare" },
  { brand_name: "Acqua di Parma", email: "press@acquadiparma.com", category: "beauty" },

];

// Filter out placeholder/skip entries
const VALID_SPONSORS = SPONSORS.filter(s => !s.email.startsWith("skip@"));

async function main() {
  console.log(`Processing ${VALID_SPONSORS.length} sponsor contacts...`);

  // Get all existing sponsor emails
  const { data: existing } = await supabase
    .from("brand_outreach_contacts")
    .select("email")
    .eq("contact_type", "sponsor");

  const existingEmails = new Set((existing || []).map(r => r.email.toLowerCase()));
  const toInsert = VALID_SPONSORS.filter(s => !existingEmails.has(s.email.toLowerCase()));

  console.log(`Already in DB: ${existingEmails.size}`);
  console.log(`New to insert: ${toInsert.length}`);

  if (toInsert.length === 0) {
    console.log("Nothing to insert.");
    return;
  }

  // Insert in batches of 100
  const BATCH = 100;
  let totalInserted = 0;

  for (let i = 0; i < toInsert.length; i += BATCH) {
    const batch = toInsert.slice(i, i + BATCH).map(s => ({
      brand_name: s.brand_name,
      contact_name: null,
      email: s.email.toLowerCase(),
      email_type: "press",
      category: s.category,
      notes: s.notes || null,
      contact_type: "sponsor",
      status: "new",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const { data, error } = await supabase
      .from("brand_outreach_contacts")
      .insert(batch)
      .select("id");

    if (error) {
      console.error(`Batch error (${i}–${i + BATCH}):`, error.message);
    } else {
      totalInserted += data?.length ?? 0;
      console.log(`  Batch ${Math.floor(i / BATCH) + 1}: inserted ${data?.length}`);
    }
  }

  console.log(`\n✓ Done. Total inserted: ${totalInserted}`);

  // Summary by category
  const { data: counts } = await supabase
    .from("brand_outreach_contacts")
    .select("category")
    .eq("contact_type", "sponsor");

  const byCat: Record<string, number> = {};
  counts?.forEach(r => { byCat[r.category] = (byCat[r.category] || 0) + 1; });
  console.log("\nTotal sponsors by category:");
  Object.entries(byCat).sort((a, b) => b[1] - a[1]).forEach(([cat, n]) => {
    console.log(`  ${cat.padEnd(15)} ${n}`);
  });
}

main().catch(console.error);
