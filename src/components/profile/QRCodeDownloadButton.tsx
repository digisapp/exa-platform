"use client";

import { Download } from "lucide-react";

interface QRCodeDownloadButtonProps {
  dataUrl: string;
  username: string;
}

export function QRCodeDownloadButton({ dataUrl, username }: QRCodeDownloadButtonProps) {
  const handleDownload = () => {
    const link = document.createElement("a");
    link.download = `exa-${username}-qr.png`;
    link.href = dataUrl;
    link.click();
  };

  return (
    <button
      onClick={handleDownload}
      className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-sm font-medium rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 hover:border-white/20 transition-all active:scale-95"
    >
      <Download className="h-4 w-4" />
      Download QR Code
    </button>
  );
}
