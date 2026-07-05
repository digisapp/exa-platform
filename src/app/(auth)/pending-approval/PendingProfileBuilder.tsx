"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Camera, Check, Loader2, Sparkles } from "lucide-react";

const t = {
  en: {
    title: "Get a head start",
    subtitle: "Add your photo and bio now — you'll go live on EXA the moment you're approved.",
    choosePhoto: "Choose photo",
    changePhoto: "Change photo",
    bioPlaceholder: "Tell brands and fans who you are and what you're looking for…",
    save: "Save",
    saving: "Saving…",
    saved: "Saved!",
    photoTooLarge: "Photo must be under 15MB",
    error: "Couldn't save — please try again",
  },
  es: {
    title: "Toma ventaja",
    subtitle: "Agrega tu foto y bio ahora — estarás visible en EXA en cuanto seas aprobada.",
    choosePhoto: "Elegir foto",
    changePhoto: "Cambiar foto",
    bioPlaceholder: "Cuéntales a marcas y fans quién eres y qué buscas…",
    save: "Guardar",
    saving: "Guardando…",
    saved: "¡Guardado!",
    photoTooLarge: "La foto debe pesar menos de 15MB",
    error: "No se pudo guardar — intenta de nuevo",
  },
};

const MAX_FILE_SIZE = 15 * 1024 * 1024;
const MAX_BIO_LENGTH = 1000;

export function PendingProfileBuilder({
  lang,
  initialBio,
  initialPhotoUrl,
}: {
  lang: "en" | "es";
  initialBio: string | null;
  initialPhotoUrl: string | null;
}) {
  const [bio, setBio] = useState(initialBio ?? "");
  const [savedBio, setSavedBio] = useState(initialBio ?? "");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(initialPhotoUrl);
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const s = t[lang];
  const hasChanges = photoFile !== null || bio.trim() !== savedBio.trim();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      setError(s.photoTooLarge);
      return;
    }
    setError(null);
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setState("idle");
  };

  const handleSave = async () => {
    setState("saving");
    setError(null);
    try {
      const formData = new FormData();
      formData.append("bio", bio.trim());
      if (photoFile) formData.append("photo", photoFile);

      const res = await fetch("/api/auth/application-profile", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || s.error);

      setSavedBio(bio);
      setPhotoFile(null);
      if (data.profile_photo_url) setPhotoPreview(data.profile_photo_url);
      setState("saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : s.error);
      setState("idle");
    }
  };

  return (
    <div className="p-4 rounded-lg bg-gradient-to-br from-pink-500/10 via-violet-500/5 to-transparent border border-pink-500/30 space-y-3">
      <div>
        <p className="text-sm font-medium flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-pink-400" />
          {s.title}
        </p>
        <p className="text-xs text-muted-foreground mt-1">{s.subtitle}</p>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="relative h-16 w-16 shrink-0 rounded-full overflow-hidden border border-dashed border-pink-500/40 bg-white/5 flex items-center justify-center hover:border-pink-500/70 transition-colors"
          aria-label={photoPreview ? s.changePhoto : s.choosePhoto}
        >
          {photoPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoPreview} alt="" className="h-full w-full object-cover" />
          ) : (
            <Camera className="h-6 w-6 text-pink-400/70" />
          )}
        </button>
        <div className="flex-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <Camera className="mr-2 h-4 w-4" />
            {photoPreview ? s.changePhoto : s.choosePhoto}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>
      </div>

      <Textarea
        value={bio}
        onChange={(e) => {
          setBio(e.target.value.slice(0, MAX_BIO_LENGTH));
          setState("idle");
        }}
        placeholder={s.bioPlaceholder}
        rows={3}
        className="resize-none text-sm"
      />

      {error && <p className="text-xs text-red-400">{error}</p>}

      <Button
        type="button"
        size="sm"
        className="w-full bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600"
        onClick={handleSave}
        disabled={state === "saving" || (!hasChanges && state !== "saved")}
      >
        {state === "saving" ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {s.saving}
          </>
        ) : state === "saved" && !hasChanges ? (
          <>
            <Check className="mr-2 h-4 w-4" />
            {s.saved}
          </>
        ) : (
          s.save
        )}
      </Button>
    </div>
  );
}
