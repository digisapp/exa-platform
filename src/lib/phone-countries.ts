// Country calling codes for the phone input. Sorted with the Americas first
// (EXA's core + expansion markets), then Europe, then the rest alphabetically.
// Names carry an es variant so the picker reads naturally in the Spanish UI.

export interface PhoneCountry {
  iso: string; // ISO 3166-1 alpha-2
  dial: string; // calling code, no "+"
  name: string;
  nameEs: string;
  flag: string;
}

export const PHONE_COUNTRIES: PhoneCountry[] = [
  // North & Central America
  { iso: "US", dial: "1", name: "United States", nameEs: "Estados Unidos", flag: "🇺🇸" },
  { iso: "MX", dial: "52", name: "Mexico", nameEs: "México", flag: "🇲🇽" },
  { iso: "CA", dial: "1", name: "Canada", nameEs: "Canadá", flag: "🇨🇦" },
  { iso: "GT", dial: "502", name: "Guatemala", nameEs: "Guatemala", flag: "🇬🇹" },
  { iso: "SV", dial: "503", name: "El Salvador", nameEs: "El Salvador", flag: "🇸🇻" },
  { iso: "HN", dial: "504", name: "Honduras", nameEs: "Honduras", flag: "🇭🇳" },
  { iso: "NI", dial: "505", name: "Nicaragua", nameEs: "Nicaragua", flag: "🇳🇮" },
  { iso: "CR", dial: "506", name: "Costa Rica", nameEs: "Costa Rica", flag: "🇨🇷" },
  { iso: "PA", dial: "507", name: "Panama", nameEs: "Panamá", flag: "🇵🇦" },
  { iso: "BZ", dial: "501", name: "Belize", nameEs: "Belice", flag: "🇧🇿" },
  // Caribbean
  { iso: "DO", dial: "1", name: "Dominican Republic", nameEs: "República Dominicana", flag: "🇩🇴" },
  { iso: "PR", dial: "1", name: "Puerto Rico", nameEs: "Puerto Rico", flag: "🇵🇷" },
  { iso: "CU", dial: "53", name: "Cuba", nameEs: "Cuba", flag: "🇨🇺" },
  { iso: "JM", dial: "1", name: "Jamaica", nameEs: "Jamaica", flag: "🇯🇲" },
  { iso: "TT", dial: "1", name: "Trinidad & Tobago", nameEs: "Trinidad y Tobago", flag: "🇹🇹" },
  { iso: "BS", dial: "1", name: "Bahamas", nameEs: "Bahamas", flag: "🇧🇸" },
  { iso: "HT", dial: "509", name: "Haiti", nameEs: "Haití", flag: "🇭🇹" },
  // South America
  { iso: "CO", dial: "57", name: "Colombia", nameEs: "Colombia", flag: "🇨🇴" },
  { iso: "AR", dial: "54", name: "Argentina", nameEs: "Argentina", flag: "🇦🇷" },
  { iso: "PE", dial: "51", name: "Peru", nameEs: "Perú", flag: "🇵🇪" },
  { iso: "VE", dial: "58", name: "Venezuela", nameEs: "Venezuela", flag: "🇻🇪" },
  { iso: "CL", dial: "56", name: "Chile", nameEs: "Chile", flag: "🇨🇱" },
  { iso: "EC", dial: "593", name: "Ecuador", nameEs: "Ecuador", flag: "🇪🇨" },
  { iso: "BO", dial: "591", name: "Bolivia", nameEs: "Bolivia", flag: "🇧🇴" },
  { iso: "PY", dial: "595", name: "Paraguay", nameEs: "Paraguay", flag: "🇵🇾" },
  { iso: "UY", dial: "598", name: "Uruguay", nameEs: "Uruguay", flag: "🇺🇾" },
  { iso: "BR", dial: "55", name: "Brazil", nameEs: "Brasil", flag: "🇧🇷" },
  { iso: "GY", dial: "592", name: "Guyana", nameEs: "Guyana", flag: "🇬🇾" },
  { iso: "SR", dial: "597", name: "Suriname", nameEs: "Surinam", flag: "🇸🇷" },
  // Europe
  { iso: "ES", dial: "34", name: "Spain", nameEs: "España", flag: "🇪🇸" },
  { iso: "GB", dial: "44", name: "United Kingdom", nameEs: "Reino Unido", flag: "🇬🇧" },
  { iso: "FR", dial: "33", name: "France", nameEs: "Francia", flag: "🇫🇷" },
  { iso: "DE", dial: "49", name: "Germany", nameEs: "Alemania", flag: "🇩🇪" },
  { iso: "IT", dial: "39", name: "Italy", nameEs: "Italia", flag: "🇮🇹" },
  { iso: "PT", dial: "351", name: "Portugal", nameEs: "Portugal", flag: "🇵🇹" },
  { iso: "NL", dial: "31", name: "Netherlands", nameEs: "Países Bajos", flag: "🇳🇱" },
  { iso: "BE", dial: "32", name: "Belgium", nameEs: "Bélgica", flag: "🇧🇪" },
  { iso: "CH", dial: "41", name: "Switzerland", nameEs: "Suiza", flag: "🇨🇭" },
  { iso: "AT", dial: "43", name: "Austria", nameEs: "Austria", flag: "🇦🇹" },
  { iso: "SE", dial: "46", name: "Sweden", nameEs: "Suecia", flag: "🇸🇪" },
  { iso: "NO", dial: "47", name: "Norway", nameEs: "Noruega", flag: "🇳🇴" },
  { iso: "DK", dial: "45", name: "Denmark", nameEs: "Dinamarca", flag: "🇩🇰" },
  { iso: "FI", dial: "358", name: "Finland", nameEs: "Finlandia", flag: "🇫🇮" },
  { iso: "IE", dial: "353", name: "Ireland", nameEs: "Irlanda", flag: "🇮🇪" },
  { iso: "PL", dial: "48", name: "Poland", nameEs: "Polonia", flag: "🇵🇱" },
  { iso: "CZ", dial: "420", name: "Czechia", nameEs: "Chequia", flag: "🇨🇿" },
  { iso: "GR", dial: "30", name: "Greece", nameEs: "Grecia", flag: "🇬🇷" },
  { iso: "RO", dial: "40", name: "Romania", nameEs: "Rumania", flag: "🇷🇴" },
  { iso: "HU", dial: "36", name: "Hungary", nameEs: "Hungría", flag: "🇭🇺" },
  { iso: "UA", dial: "380", name: "Ukraine", nameEs: "Ucrania", flag: "🇺🇦" },
  { iso: "RU", dial: "7", name: "Russia", nameEs: "Rusia", flag: "🇷🇺" },
  { iso: "TR", dial: "90", name: "Turkey", nameEs: "Turquía", flag: "🇹🇷" },
  // Rest of world (common markets)
  { iso: "AU", dial: "61", name: "Australia", nameEs: "Australia", flag: "🇦🇺" },
  { iso: "NZ", dial: "64", name: "New Zealand", nameEs: "Nueva Zelanda", flag: "🇳🇿" },
  { iso: "JP", dial: "81", name: "Japan", nameEs: "Japón", flag: "🇯🇵" },
  { iso: "KR", dial: "82", name: "South Korea", nameEs: "Corea del Sur", flag: "🇰🇷" },
  { iso: "CN", dial: "86", name: "China", nameEs: "China", flag: "🇨🇳" },
  { iso: "IN", dial: "91", name: "India", nameEs: "India", flag: "🇮🇳" },
  { iso: "PH", dial: "63", name: "Philippines", nameEs: "Filipinas", flag: "🇵🇭" },
  { iso: "ID", dial: "62", name: "Indonesia", nameEs: "Indonesia", flag: "🇮🇩" },
  { iso: "TH", dial: "66", name: "Thailand", nameEs: "Tailandia", flag: "🇹🇭" },
  { iso: "VN", dial: "84", name: "Vietnam", nameEs: "Vietnam", flag: "🇻🇳" },
  { iso: "SG", dial: "65", name: "Singapore", nameEs: "Singapur", flag: "🇸🇬" },
  { iso: "MY", dial: "60", name: "Malaysia", nameEs: "Malasia", flag: "🇲🇾" },
  { iso: "AE", dial: "971", name: "United Arab Emirates", nameEs: "Emiratos Árabes Unidos", flag: "🇦🇪" },
  { iso: "SA", dial: "966", name: "Saudi Arabia", nameEs: "Arabia Saudita", flag: "🇸🇦" },
  { iso: "IL", dial: "972", name: "Israel", nameEs: "Israel", flag: "🇮🇱" },
  { iso: "ZA", dial: "27", name: "South Africa", nameEs: "Sudáfrica", flag: "🇿🇦" },
  { iso: "NG", dial: "234", name: "Nigeria", nameEs: "Nigeria", flag: "🇳🇬" },
  { iso: "EG", dial: "20", name: "Egypt", nameEs: "Egipto", flag: "🇪🇬" },
  { iso: "MA", dial: "212", name: "Morocco", nameEs: "Marruecos", flag: "🇲🇦" },
];

export function findPhoneCountry(iso: string | null | undefined): PhoneCountry | undefined {
  if (!iso) return undefined;
  const upper = iso.toUpperCase();
  return PHONE_COUNTRIES.find((c) => c.iso === upper);
}
