export const metadata = {
  title: "Payment Complete | EXA Beach Shop",
};

export default function BeachPaymentSuccess() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-950 via-blue-950 to-indigo-950 flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="text-8xl mb-6">🎉</div>
        <h1 className="text-4xl font-bold text-white mb-3">Payment Complete!</h1>
        <p className="text-white/60 text-lg mb-6">
          Thank you for your purchase!
        </p>
        <div className="bg-white/5 border border-white/10 rounded-2xl px-6 py-4 mb-6">
          <p className="text-white/80 text-sm">
            Your items will be handed over by our team. Enjoy the beach! 🌊
          </p>
        </div>
        <p className="text-white/30 text-xs">EXA Models Beach Shop</p>
      </div>
    </div>
  );
}
