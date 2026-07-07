"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Camera, Check, Loader2, Sparkles } from "lucide-react";

const t = {
  en: {
    title: "Add your photo — required for approval",
    titleDone: "Looking good!",
    subtitle: "We can't approve you without a profile photo. Add a bio too and you'll go live on EXA the moment you're approved.",
    subtitleDone: "Photo saved — add or polish your bio and you'll go live the moment you're approved.",
    required: "Required",
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
    title: "Agrega tu foto — requerida para aprobarte",
    titleDone: "¡Te ves increíble!",
    subtitle: "No podemos aprobarte sin foto de perfil. Agrega también tu bio y estarás visible en EXA en cuanto seas aprobada.",
    subtitleDone: "Foto guardada — agrega o mejora tu bio y estarás visible en cuanto seas aprobada.",
    required: "Requerida",
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
const MAX_UPLOAD_EDGE = 2048;

// Downscale to <=2048px on the long edge and re-encode as JPEG before upload:
// shrinks 10MB+ cellular uploads and strips EXIF/GPS metadata client-side.
// On any failure, returns the original file (server still guards formats).
async function downscaleForUpload(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_UPLOAD_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.85)
    );
    return blob ?? file;
  } catch {
    return file;
  }
}

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
      if (photoFile) {
        const upload = await downscaleForUpload(photoFile);
        formData.append(
          "photo",
          upload,
          upload === photoFile ? photoFile.name : "photo.jpg"
        );
      }

      const res = await fetch("/api/auth/application-profile", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || s.error);

      // Photo-request path: the upload just auto-approved her — go straight
      // to the dashboard instead of leaving her on a stale pending page.
      if (data.approved) {
        window.location.href = "/dashboard";
        return;
      }

      setSavedBio(bio);
      setPhotoFile(null);
      if (data.profile_photo_url) setPhotoPreview(data.profile_photo_url);
      setState("saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : s.error);
      setState("idle");
    }
  };

  const hasPhoto = Boolean(photoPreview);

  return (
    <div
      className={
        hasPhoto
          ? "p-4 rounded-lg bg-gradient-to-br from-pink-500/10 via-violet-500/5 to-transparent border border-pink-500/30 space-y-3"
          : "p-4 rounded-lg bg-gradient-to-br from-amber-500/10 via-pink-500/5 to-transparent border border-amber-500/40 space-y-3"
      }
    >
      <div>
        <p className="text-sm font-medium flex items-center gap-2">
          <Sparkles className={hasPhoto ? "h-4 w-4 text-pink-400" : "h-4 w-4 text-amber-400"} />
          {hasPhoto ? s.titleDone : s.title}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {hasPhoto ? s.subtitleDone : s.subtitle}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className={
            hasPhoto
              ? "relative h-16 w-16 shrink-0 rounded-full overflow-hidden border border-dashed border-pink-500/40 bg-white/5 flex items-center justify-center hover:border-pink-500/70 transition-colors"
              : "relative h-16 w-16 shrink-0 rounded-full overflow-hidden border border-dashed border-amber-500/60 bg-white/5 flex items-center justify-center hover:border-amber-400 transition-colors"
          }
          aria-label={photoPreview ? s.changePhoto : s.choosePhoto}
        >
          {photoPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoPreview} alt="" className="h-full w-full object-cover" />
          ) : (
            <Camera className="h-6 w-6 text-amber-400/80" />
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
          {!hasPhoto && (
            <span className="ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 uppercase tracking-wide align-middle">
              {s.required}
            </span>
          )}
          <input
            ref={fileInputRef}
            type="file"
            // Deliberately NOT listing image/heic|heif: iOS Safari auto-transcodes
            // HEIC to JPEG only when the accept attribute excludes HEIC.
            accept="image/jpeg,image/png,image/webp"
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
