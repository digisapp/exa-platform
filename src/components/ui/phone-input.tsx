"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PHONE_COUNTRIES, findPhoneCountry } from "@/lib/phone-countries";
import { readCookie } from "@/i18n/context";

interface PhoneInputProps {
  id?: string;
  value: string; // E.164 ("+5215512345678") or ""
  onChange: (e164: string) => void;
  locale?: "en" | "es";
  disabled?: boolean;
  required?: boolean;
}

/**
 * Phone input with a country-code picker that emits E.164 strings.
 * Defaults the country from the exa-geo-country cookie (set by middleware),
 * falling back to MX for the Spanish UI and US otherwise.
 */
export function PhoneInput({ id, value, onChange, locale = "en", disabled, required }: PhoneInputProps) {
  const [countryIso, setCountryIso] = useState<string>(() => {
    const geo = findPhoneCountry(readCookie("exa-geo-country"));
    if (geo) return geo.iso;
    return locale === "es" ? "MX" : "US";
  });
  const [national, setNational] = useState("");

  const country = useMemo(
    () => findPhoneCountry(countryIso) ?? PHONE_COUNTRIES[0],
    [countryIso]
  );

  // Parent cleared the value (e.g. form reset after the dialog closes)
  useEffect(() => {
    if (value === "") setNational("");
  }, [value]);

  const emit = (iso: string, nationalInput: string) => {
    const dial = findPhoneCountry(iso)?.dial ?? "1";
    const digits = nationalInput.replace(/\D/g, "");
    onChange(digits ? `+${dial}${digits}` : "");
  };

  const handleNationalChange = (input: string) => {
    // Digits plus common separators only; E.164 national part caps at 14
    const cleaned = input.replace(/[^\d\s()-]/g, "").slice(0, 18);
    setNational(cleaned);
    emit(countryIso, cleaned);
  };

  const handleCountryChange = (iso: string) => {
    setCountryIso(iso);
    emit(iso, national);
  };

  return (
    <div className="flex gap-2">
      <Select value={countryIso} onValueChange={handleCountryChange} disabled={disabled}>
        <SelectTrigger className="w-[110px] shrink-0" aria-label={locale === "es" ? "Código de país" : "Country code"}>
          <SelectValue>
            <span className="flex items-center gap-1.5">
              <span>{country.flag}</span>
              <span className="text-muted-foreground">+{country.dial}</span>
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-72">
          {PHONE_COUNTRIES.map((c) => (
            <SelectItem key={c.iso} value={c.iso}>
              <span className="flex items-center gap-2">
                <span>{c.flag}</span>
                <span>{locale === "es" ? c.nameEs : c.name}</span>
                <span className="text-muted-foreground">+{c.dial}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        id={id}
        type="tel"
        inputMode="tel"
        placeholder={countryIso === "MX" ? "55 1234 5678" : "555 123 4567"}
        value={national}
        onChange={(e) => handleNationalChange(e.target.value)}
        disabled={disabled}
        required={required}
        autoComplete="tel-national"
        className="flex-1"
      />
    </div>
  );
}
