export default function Hero() {
  return (
    <section className="flex min-h-screen items-center justify-center px-6">
      <div className="max-w-5xl text-center">

        <div className="inline-flex rounded-full border border-violet-500/40 bg-violet-500/10 px-5 py-2 text-sm text-violet-300">
          🚀 Phase 1 Testnet Live
        </div>

        <h1 className="mt-8 text-6xl font-extrabold leading-tight md:text-8xl">
          The DEX
          <br />
          That Should Already Exist
        </h1>

        <p className="mx-auto mt-8 max-w-2xl text-lg text-zinc-400">
          Lightning-fast swaps, deep liquidity, and a modern DeFi experience
          built for everyone.
        </p>

        <div className="mt-10 flex flex-wrap justify-center gap-5">
          <button className="rounded-xl bg-violet-600 px-8 py-4 text-lg font-semibold hover:bg-violet-500">
            Launch App
          </button>

          <button className="rounded-xl border border-zinc-700 px-8 py-4 text-lg hover:bg-zinc-900">
            Read Docs
          </button>
        </div>
      </div>
    </section>
  );
}
