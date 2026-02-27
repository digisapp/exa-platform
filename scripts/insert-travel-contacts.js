const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const travelContacts = [
  { brand_name: "Circa 39 Hotel", contact_name: "Clemente Beda", email: "cle@clhotels.us", email_type: "general", instagram_handle: "circa39hotel", category: "travel", contact_type: "outreach", location_city: "Miami", location_country: "US", notes: "Owner", status: "new" },
  { brand_name: "Hotel Granada Midtown", contact_name: "Samuel Thomas", email: "sthomas@granadaatlanta.com", email_type: "general", instagram_handle: "hotelgranada_atlanta", category: "travel", contact_type: "outreach", location_city: "Atlanta", location_country: "US", notes: "GM", status: "new" },
  { brand_name: "Hotel Chantelle", contact_name: "Andrea Richino", email: "abruptdrea@gmail.com", email_type: "general", instagram_handle: "hotelchantelle", category: "travel", contact_type: "outreach", location_city: "New York", location_country: "US", notes: "Content Strategist", status: "new" },
  { brand_name: "Renascer em Buzios Hotel Boutique", contact_name: "Erika Cristina Antilef", email: "erikaantilef@gmail.com", email_type: "general", instagram_handle: "renascer_embuzios", category: "travel", contact_type: "outreach", location_city: "Rio de Janeiro", location_country: "Brazil", notes: "Gerente", status: "new" },
  { brand_name: "Cassa Lepage Art Hotel", contact_name: "Patricia Etchehun", email: "cassalepage@gmail.com", email_type: "general", instagram_handle: "cassalepagebuenosaires", category: "travel", contact_type: "outreach", location_city: "Buenos Aires", location_country: "Argentina", notes: "Comunicación & Imagen", status: "new" },
  { brand_name: "The Glenmark Hotel", contact_name: "Iryna Rozhyk", email: "irozhyk@theglenmarkhotel.com", email_type: "general", instagram_handle: "theglenmarkhotel", category: "travel", contact_type: "outreach", location_city: "Glendale", location_country: "US", notes: "Manager", status: "new" },
  { brand_name: "Caribbean Travel and Tours", contact_name: "Britt Pigat", email: "social@caribbeantravelandtours.com", email_type: "general", instagram_handle: "caribbeantraveltours", category: "travel", contact_type: "outreach", location_city: "St Vincent", location_country: "Caribbean", notes: "Content Strategist", status: "new" },
  { brand_name: "Plannin Travel", contact_name: "Natasha Lao", email: "natasha.lao@plannin.com", email_type: "general", instagram_handle: "plannintravel", category: "travel", contact_type: "outreach", location_city: null, location_country: null, notes: "Director of Marketing", status: "new" },
  { brand_name: "UMi Tulum", contact_name: "Giselle Sandoval", email: "comunicacion@umitulum.com", email_type: "general", instagram_handle: "umitulum", category: "travel", contact_type: "outreach", location_city: "Tulum", location_country: "Mexico", notes: "Marketing", status: "new" },
];

(async () => {
  const { data, error } = await supabase
    .from('brand_outreach_contacts')
    .insert(travelContacts)
    .select('id, brand_name');

  if (error) {
    console.log('Error:', error.message);
  } else {
    console.log('Inserted ' + data.length + ' travel contacts:');
    data.forEach(c => console.log(' -', c.brand_name));
  }
})();
