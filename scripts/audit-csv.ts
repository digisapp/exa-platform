import { readFileSync } from "fs";

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") { cur.push(field); field = ""; }
      else if (c === "\n") { cur.push(field); rows.push(cur); cur = []; field = ""; }
      else if (c === "\r") { /* skip */ }
      else field += c;
    }
  }
  if (field.length || cur.length) { cur.push(field); rows.push(cur); }
  return rows;
}

const rows = parseCsv(readFileSync("/Users/examodels/Desktop/MSW Model Availability.csv", "utf-8"));
let missingIg = 0, missingFollowers = 0;
const noIg: string[] = [], noFollowers: string[] = [];
for (let i = 1; i < rows.length; i++) {
  const r = rows[i];
  if (!r || r.length < 3) continue;
  if (!r[1] || r[1].trim() === "") { missingIg++; noIg.push(r[0]); }
  if (!r[2] || r[2].trim() === "") { missingFollowers++; noFollowers.push(r[0]); }
}
console.log(`Total rows: ${rows.length - 1}`);
console.log(`Missing IG URL: ${missingIg}`);
if (noIg.length) console.log("  ", noIg.join(", "));
console.log(`Missing Followers: ${missingFollowers}`);
if (noFollowers.length) console.log("  ", noFollowers.join(", "));
