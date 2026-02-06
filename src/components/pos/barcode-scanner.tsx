"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { X, Camera, Keyboard, Loader2 } from "lucide-react";

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [manualMode, setManualMode] = useState(false);
  const [manualInput, setManualInput] = useState("");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (manualMode) return;

    let animationId: number;
    let barcodeDetector: any = null;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment",
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setIsScanning(true);

          // Check if BarcodeDetector is available (Chrome, Edge)
          if ("BarcodeDetector" in window) {
            barcodeDetector = new (window as any).BarcodeDetector({
              formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "qr_code"],
            });

            const detectBarcode = async () => {
              if (!videoRef.current || videoRef.current.readyState !== 4) {
                animationId = requestAnimationFrame(detectBarcode);
                return;
              }

              try {
                const barcodes = await barcodeDetector.detect(videoRef.current);
                if (barcodes.length > 0) {
                  const barcode = barcodes[0].rawValue;
                  stopCamera();
                  onScan(barcode);
                  return;
                }
              } catch (err) {
                console.error("Barcode detection error:", err);
              }

              animationId = requestAnimationFrame(detectBarcode);
            };

            detectBarcode();
          } else {
            // Fallback for browsers without BarcodeDetector
            setCameraError("Barcode detection not supported. Use manual entry.");
            setManualMode(true);
          }
        }
      } catch (err) {
        console.error("Camera error:", err);
        setCameraError("Could not access camera. Please allow camera access or use manual entry.");
        setManualMode(true);
      }
    };

    const stopCamera = () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };

    startCamera();

    return () => {
      stopCamera();
    };
  }, [manualMode, onScan]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim()) {
      onScan(manualInput.trim());
    }
  };

  const handleClose = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">
            {manualMode ? "Enter SKU/Barcode" : "Scan Barcode"}
          </h2>
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {manualMode ? (
          <form onSubmit={handleManualSubmit} className="space-y-4">
            <Input
              placeholder="Enter SKU or barcode..."
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              autoFocus
              className="h-12 text-lg"
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setManualMode(false)}
                className="flex-1"
              >
                <Camera className="h-4 w-4 mr-2" />
                Use Camera
              </Button>
              <Button type="submit" className="flex-1">
                Look Up
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* Scanning overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-64 h-32 border-2 border-green-500 rounded-lg relative">
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-green-500 rounded-tl" />
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-green-500 rounded-tr" />
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-green-500 rounded-bl" />
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-green-500 rounded-br" />

                  {/* Scanning line animation */}
                  <div className="absolute inset-x-0 top-0 h-0.5 bg-green-500 animate-scan" />
                </div>
              </div>

              {!isScanning && !cameraError && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <Loader2 className="h-8 w-8 animate-spin text-white" />
                </div>
              )}
            </div>

            {cameraError && (
              <p className="text-sm text-destructive text-center">{cameraError}</p>
            )}

            <p className="text-sm text-muted-foreground text-center">
              Position barcode within the frame
            </p>

            <Button
              variant="outline"
              onClick={() => setManualMode(true)}
              className="w-full"
            >
              <Keyboard className="h-4 w-4 mr-2" />
              Enter Manually
            </Button>
          </div>
        )}
      </Card>

      <style jsx>{`
        @keyframes scan {
          0% {
            top: 0;
          }
          50% {
            top: calc(100% - 2px);
          }
          100% {
            top: 0;
          }
        }
        .animate-scan {
          animation: scan 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
