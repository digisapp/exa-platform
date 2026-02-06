import { Toaster } from "sonner";

export const metadata = {
  title: "EXA POS | Point of Sale",
  description: "EXA Models Point of Sale System",
};

export default function POSLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      {children}
      <Toaster richColors position="top-center" />
    </div>
  );
}
