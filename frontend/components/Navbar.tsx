export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-black/40 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">

        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-500 shadow-lg shadow-purple-500/30" />

          <div>
            <h1 className="text-xl font-bold text-white">
              Freesia DEX
            </h1>

            <p className="text-xs text-zinc-400">
              Testnet
            </p>
          </div>
        </div>

        <div className="hidden gap-8 text-sm text-zinc-300 md:flex">
          <a href="#" className="hover:text-white transition">
            Trade
          </a>

          <a href="#" className="hover:text-white transition">
            Pool
          </a>

          <a href="#" className="hover:text-white transition">
            Docs
          </a>
        </div>

        <button className="rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-500 px-6 py-3 font-semibold text-white transition hover:scale-105">
          Connect Wallet
        </button>

      </div>
    </nav>
  );
}
