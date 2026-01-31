"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// Dynamic import - Three.js only loads when this page is visited
const CatwalkGame3D = dynamic(() => import("./CatwalkGame3D"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center min-h-[600px] gap-4">
      <Loader2 className="h-12 w-12 animate-spin text-pink-500" />
      <p className="text-gray-400">Loading 3D Runway...</p>
    </div>
  ),
});

export default function Catwalk3DPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-black">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-gray-950/80 backdrop-blur-sm border-b border-gray-800">
        <div className="container mx-auto px-4 py-3 flex items-center gap-4">
          <Link href="/games">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <h1 className="text-xl font-bold text-white">Catwalk 3D</h1>
          <span className="text-xs bg-pink-500/20 text-pink-400 px-2 py-1 rounded-full">
            BETA
          </span>
        </div>
      </div>

      {/* Game Container */}
      <div className="container mx-auto px-4 py-6">
        <CatwalkGame3D />
      </div>
    </div>
  );
}
