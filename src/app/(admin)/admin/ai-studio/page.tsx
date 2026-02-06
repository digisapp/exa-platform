"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Video,
  Image as ImageIcon,
  Sparkles,
  Upload,
  Play,
  Download,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Wand2,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

interface Generation {
  id: string;
  provider: string;
  model: string;
  mode: string;
  prompt: string;
  input_image_url: string | null;
  task_id: string;
  status: "processing" | "completed" | "failed";
  output_url: string | null;
  thumbnail_url: string | null;
  metadata: {
    duration?: number;
    aspect_ratio?: string;
    quality?: string;
  };
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

export default function AIStudioPage() {
  const [loading, setLoading] = useState(true);
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [pollingTasks, setPollingTasks] = useState<Set<string>>(new Set());

  // Form state
  const [mode, setMode] = useState<"text-to-video" | "image-to-video">("text-to-video");
  const [prompt, setPrompt] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [duration, setDuration] = useState<"5" | "10">("5");
  const [aspectRatio, setAspectRatio] = useState<"16:9" | "9:16" | "1:1">("16:9");
  const [quality, setQuality] = useState<"standard" | "pro">("standard");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();

  const fetchGenerations = useCallback(async () => {
    try {
      const res = await fetch("/api/ai/generations");
      if (res.ok) {
        const data = await res.json();
        setGenerations(data.generations || []);
      }
    } catch (error) {
      console.error("Error fetching generations:", error);
    }
  }, []);

  const checkAuth = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/signin");
      return false;
    }

    const { data: actor } = await supabase
      .from("actors")
      .select("type")
      .eq("user_id", user.id)
      .single();

    if (actor?.type !== "admin") {
      router.push("/dashboard");
      return false;
    }

    return true;
  }, [supabase, router]);

  useEffect(() => {
    const init = async () => {
      const isAdmin = await checkAuth();
      if (isAdmin) {
        await fetchGenerations();
      }
      setLoading(false);
    };
    init();
  }, [checkAuth, fetchGenerations]);

  // Poll for processing tasks
  useEffect(() => {
    if (pollingTasks.size === 0) return;

    const interval = setInterval(async () => {
      for (const taskId of pollingTasks) {
        try {
          const res = await fetch(`/api/ai/kling/status/${taskId}`);
          if (res.ok) {
            const data = await res.json();
            if (data.status === "completed" || data.status === "failed") {
              setPollingTasks((prev) => {
                const next = new Set(prev);
                next.delete(taskId);
                return next;
              });
              fetchGenerations();
              if (data.status === "completed") {
                toast.success("Video generation complete!");
              } else {
                toast.error("Video generation failed");
              }
            }
          }
        } catch (error) {
          console.error("Polling error:", error);
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [pollingTasks, fetchGenerations]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    setUploadingImage(true);
    try {
      const fileName = `ai-studio/${Date.now()}-${file.name}`;
      const { data, error } = await supabase.storage
        .from("public")
        .upload(fileName, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from("public")
        .getPublicUrl(fileName);

      setImageUrl(publicUrl);
      toast.success("Image uploaded");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    if (mode === "image-to-video" && !imageUrl) {
      toast.error("Please upload an image");
      return;
    }

    setIsGenerating(true);
    try {
      const res = await fetch("/api/ai/kling/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          prompt,
          imageUrl: mode === "image-to-video" ? imageUrl : undefined,
          duration: parseInt(duration),
          aspectRatio,
          quality,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Generation failed");
      }

      toast.success("Video generation started!");
      setPollingTasks((prev) => new Set(prev).add(data.taskId));
      fetchGenerations();

      // Reset form
      setPrompt("");
      setImageUrl("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Generation failed");
    } finally {
      setIsGenerating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "processing":
        return <Badge variant="secondary"><Loader2 className="h-3 w-3 animate-spin mr-1" />Processing</Badge>;
      case "completed":
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Complete</Badge>;
      case "failed":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const processingCount = generations.filter((g) => g.status === "processing").length;
  const completedCount = generations.filter((g) => g.status === "completed").length;

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Sparkles className="h-8 w-8 text-purple-500" />
            AI Studio
          </h1>
          <p className="text-muted-foreground mt-1">
            Generate videos with Kling 3.0 AI
          </p>
        </div>
        <Button variant="outline" onClick={fetchGenerations}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-500/10 rounded-lg">
                <Video className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{generations.length}</p>
                <p className="text-sm text-muted-foreground">Total Generations</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-500/10 rounded-lg">
                <Clock className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{processingCount}</p>
                <p className="text-sm text-muted-foreground">Processing</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/10 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{completedCount}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="generate" className="space-y-6">
        <TabsList>
          <TabsTrigger value="generate">Generate</TabsTrigger>
          <TabsTrigger value="history">History ({generations.length})</TabsTrigger>
        </TabsList>

        {/* Generate Tab */}
        <TabsContent value="generate">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Input Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wand2 className="h-5 w-5" />
                  Create Video
                </CardTitle>
                <CardDescription>
                  Generate AI videos from text or images
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Mode Selection */}
                <div className="space-y-2">
                  <Label>Generation Mode</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant={mode === "text-to-video" ? "default" : "outline"}
                      onClick={() => setMode("text-to-video")}
                      className="h-16 flex-col gap-1"
                    >
                      <Video className="h-5 w-5" />
                      <span className="text-xs">Text to Video</span>
                    </Button>
                    <Button
                      variant={mode === "image-to-video" ? "default" : "outline"}
                      onClick={() => setMode("image-to-video")}
                      className="h-16 flex-col gap-1"
                    >
                      <ImageIcon className="h-5 w-5" />
                      <span className="text-xs">Image to Video</span>
                    </Button>
                  </div>
                </div>

                {/* Image Upload (for image-to-video) */}
                {mode === "image-to-video" && (
                  <div className="space-y-2">
                    <Label>Source Image</Label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    {imageUrl ? (
                      <div className="relative">
                        <img
                          src={imageUrl}
                          alt="Source"
                          className="w-full h-48 object-cover rounded-lg"
                        />
                        <Button
                          size="sm"
                          variant="destructive"
                          className="absolute top-2 right-2"
                          onClick={() => setImageUrl("")}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        className="w-full h-32 border-dashed"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingImage}
                      >
                        {uploadingImage ? (
                          <Loader2 className="h-6 w-6 animate-spin" />
                        ) : (
                          <div className="flex flex-col items-center gap-2">
                            <Upload className="h-6 w-6" />
                            <span>Upload Image</span>
                          </div>
                        )}
                      </Button>
                    )}
                  </div>
                )}

                {/* Prompt */}
                <div className="space-y-2">
                  <Label>Prompt</Label>
                  <Textarea
                    placeholder="Describe the video you want to create..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    Be specific about camera movements, lighting, and actions
                  </p>
                </div>

                {/* Settings Grid */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Duration</Label>
                    <Select value={duration} onValueChange={(v) => setDuration(v as "5" | "10")}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5 seconds</SelectItem>
                        <SelectItem value="10">10 seconds</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Aspect Ratio</Label>
                    <Select value={aspectRatio} onValueChange={(v) => setAspectRatio(v as "16:9" | "9:16" | "1:1")}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="16:9">16:9 (Landscape)</SelectItem>
                        <SelectItem value="9:16">9:16 (Portrait)</SelectItem>
                        <SelectItem value="1:1">1:1 (Square)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Quality</Label>
                    <Select value={quality} onValueChange={(v) => setQuality(v as "standard" | "pro")}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="pro">Pro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Generate Button */}
                <Button
                  className="w-full h-12 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  onClick={handleGenerate}
                  disabled={isGenerating || !prompt.trim()}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5 mr-2" />
                      Generate Video
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Tips Card */}
            <Card>
              <CardHeader>
                <CardTitle>Tips for Better Results</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2">📹 Camera Movements</h4>
                    <p className="text-sm text-muted-foreground">
                      Include camera directions like &quot;slow zoom in&quot;, &quot;pan left to right&quot;,
                      or &quot;tracking shot following the subject&quot;
                    </p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2">🎨 Style & Mood</h4>
                    <p className="text-sm text-muted-foreground">
                      Describe the visual style: &quot;cinematic lighting&quot;, &quot;golden hour&quot;,
                      &quot;high fashion editorial&quot;, &quot;vibrant colors&quot;
                    </p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2">👗 For Swimwear</h4>
                    <p className="text-sm text-muted-foreground">
                      Try prompts like &quot;model walking on beach, wind blowing through hair,
                      slow motion waves in background, golden hour lighting&quot;
                    </p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2">🖼️ Image to Video</h4>
                    <p className="text-sm text-muted-foreground">
                      Upload a product photo and describe the motion you want:
                      &quot;gentle fabric movement&quot;, &quot;model turns slowly&quot;
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {generations.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Video className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No generations yet. Create your first video above!</p>
                </CardContent>
              </Card>
            ) : (
              generations.map((gen) => (
                <Card key={gen.id} className="overflow-hidden">
                  {/* Thumbnail/Video Preview */}
                  <div className="aspect-video bg-muted relative">
                    {gen.status === "completed" && gen.output_url ? (
                      <video
                        src={gen.output_url}
                        className="w-full h-full object-cover"
                        controls
                        poster={gen.thumbnail_url || undefined}
                      />
                    ) : gen.status === "processing" ? (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="text-center">
                          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-purple-500" />
                          <p className="text-sm text-muted-foreground">Generating...</p>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <XCircle className="h-8 w-8 text-red-500" />
                      </div>
                    )}
                  </div>

                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      {getStatusBadge(gen.status)}
                      <span className="text-xs text-muted-foreground">
                        {new Date(gen.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm line-clamp-2 mb-3">{gen.prompt}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline">{gen.mode}</Badge>
                      <Badge variant="outline">{gen.metadata.aspect_ratio}</Badge>
                      <Badge variant="outline">{gen.metadata.duration}s</Badge>
                    </div>
                    {gen.status === "completed" && gen.output_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-3"
                        asChild
                      >
                        <a href={gen.output_url} download target="_blank" rel="noopener noreferrer">
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </a>
                      </Button>
                    )}
                    {gen.status === "failed" && gen.error_message && (
                      <p className="text-xs text-red-500 mt-2">{gen.error_message}</p>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
