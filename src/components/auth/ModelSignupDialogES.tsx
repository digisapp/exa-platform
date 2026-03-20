"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Clock, Sparkles, Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

interface ModelSignupDialogESProps {
  children: React.ReactNode;
}

export function ModelSignupDialogES({ children }: ModelSignupDialogESProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [isImportedModel, setIsImportedModel] = useState(false);
  const [importedModelInfo, setImportedModelInfo] = useState<{
    name: string;
    instagram: string;
  } | null>(null);

  const [name, setName] = useState("");
  const [instagram, setInstagram] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [height, setHeight] = useState("");

  const supabase = createClient();

  const heightOptions = [
    "4'10\"", "4'11\"",
    "5'0\"", "5'1\"", "5'2\"", "5'3\"", "5'4\"", "5'5\"", "5'6\"", "5'7\"", "5'8\"", "5'9\"", "5'10\"", "5'11\"",
    "6'0\"", "6'1\"", "6'2\"", "6'3\"", "6'4\"", "6'5\"", "6'6\"", "6'7\"", "6'8\"", "6'9\"", "6'10\"", "6'11\"",
    "7'0\""
  ];

  const checkImportedModel = async (emailToCheck: string) => {
    if (!emailToCheck || !emailToCheck.includes("@")) return;

    setCheckingEmail(true);
    try {
      const res = await fetch(`/api/auth/check-imported?email=${encodeURIComponent(emailToCheck.toLowerCase().trim())}`);
      const data = await res.json();

      if (data.isImported) {
        setIsImportedModel(true);
        setImportedModelInfo({
          name: data.name || "",
          instagram: data.instagram || "",
        });
        if (data.name && !name) setName(data.name);
        if (data.instagram && !instagram) setInstagram(data.instagram);
      } else {
        setIsImportedModel(false);
        setImportedModelInfo(null);
      }
    } catch {
      setIsImportedModel(false);
      setImportedModelInfo(null);
    } finally {
      setCheckingEmail(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Por favor ingresa tu nombre");
      return;
    }

    if (!instagram.trim()) {
      toast.error("Por favor ingresa tu usuario de Instagram");
      return;
    }

    if (!email.trim()) {
      toast.error("Por favor ingresa tu correo electrónico");
      return;
    }

    if (!email.includes("@") || !email.includes(".")) {
      toast.error("Por favor ingresa un correo válido");
      return;
    }

    if (password.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    if (!dateOfBirth) {
      toast.error("Por favor ingresa tu fecha de nacimiento");
      return;
    }

    const dob = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }

    if (age < 18) {
      toast.error("Debes tener al menos 18 años para aplicar");
      return;
    }

    if (!height) {
      toast.error("Por favor selecciona tu estatura");
      return;
    }

    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password,
        options: {
          data: {
            signup_type: "model",
            display_name: name.trim(),
            instagram_username: instagram.trim().replace("@", ""),
            preferred_language: "es",
          },
        },
      });

      if (authError) {
        if (authError.message.includes("already registered") || authError.message.includes("already been registered")) {
          throw new Error("Este correo ya está registrado. Intenta iniciar sesión.");
        }
        if (authError.message.includes("rate limit")) {
          throw new Error("Demasiados intentos. Espera un momento e intenta de nuevo.");
        }
        throw authError;
      }

      if (!authData.user) {
        throw new Error("No se pudo crear la cuenta");
      }

      const res = await fetch("/api/auth/model-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.toLowerCase().trim(),
          userId: authData.user.id,
          instagram_username: instagram.trim().replace("@", ""),
          tiktok_username: "",
          phone: phone.trim() || null,
          date_of_birth: dateOfBirth,
          height: height,
          preferred_language: "es",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al enviar la solicitud");
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      });

      if (signInError) {
        toast.success("¡Solicitud enviada! Por favor inicia sesión.");
        window.location.href = "/signin";
        return;
      }

      if (data.isImported) {
        toast.success("¡Bienvenida de vuelta! Tu perfil está listo.");
        window.location.href = "/dashboard";
      } else {
        toast.success("¡Solicitud enviada!");
        window.location.href = "/pending-approval";
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Algo salió mal";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setTimeout(() => {
      setIsImportedModel(false);
      setImportedModelInfo(null);
      setName("");
      setInstagram("");
      setEmail("");
      setPassword("");
      setPhone("");
      setDateOfBirth("");
      setHeight("");
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => o ? setOpen(true) : handleClose()}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-2">
            <Image
              src="/exa-logo-white.png"
              alt="EXA"
              width={80}
              height={32}
              className="h-8 w-auto"
            />
          </div>
          <DialogTitle className="text-xl">Registro de Modelo</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name-es">Nombre Completo</Label>
            <Input
              id="name-es"
              placeholder="Tu nombre completo"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="instagram-es">Instagram</Label>
            <Input
              id="instagram-es"
              placeholder="@tuusuario"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email-es">Correo Electrónico</Label>
            <div className="relative">
              <Input
                id="email-es"
                type="email"
                placeholder="tu@correo.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (isImportedModel) {
                    setIsImportedModel(false);
                    setImportedModelInfo(null);
                  }
                }}
                onBlur={(e) => checkImportedModel(e.target.value)}
                disabled={loading}
                required
              />
              {checkingEmail && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
            {isImportedModel && importedModelInfo && (
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-sm">
                <p className="font-medium text-green-500 flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  ¡Bienvenida de vuelta{importedModelInfo.name ? `, ${importedModelInfo.name.split(" ")[0]}` : ""}!
                </p>
                <p className="text-muted-foreground text-xs mt-1">
                  Ya tenemos tu perfil listo. Completa el registro para reclamar tu cuenta.
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="modelPassword-es">Contraseña</Label>
            <div className="relative">
              <Input
                id="modelPassword-es"
                type={showPassword ? "text" : "password"}
                placeholder="Crea una contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Debe tener al menos 8 caracteres
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone-es">Teléfono</Label>
            <Input
              id="phone-es"
              type="tel"
              placeholder="+52 55 1234 5678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="dob-es">Fecha de Nacimiento</Label>
              <Input
                id="dob-es"
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                disabled={loading}
                required
                max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
                className="text-sm px-2"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="height-es">Estatura</Label>
              <Select value={height} onValueChange={setHeight} disabled={loading}>
                <SelectTrigger id="height-es">
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  {heightOptions.map((h) => (
                    <SelectItem key={h} value={h}>
                      {h}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-muted/50 text-sm space-y-1">
            <p className="text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              Revisaremos tu solicitud en 24 horas
            </p>
            <p className="text-muted-foreground ml-6">
              Una vez aprobada, tendrás acceso completo como modelo
            </p>
          </div>

          <Button
            type="submit"
            className="w-full h-12 text-base bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              "Enviar Solicitud"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
