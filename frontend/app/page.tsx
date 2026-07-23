import Background from "@/components/Background";
import Navbar from "@/components/Navbar";

export default function Home() {
  return (
    <>
      <Background />
      <Navbar />

      <main className="flex min-h-screen items-center justify-center bg-black">
        <h1 className="text-6xl font-bold text-white">
          Freesia DEX
        </h1>
      </main>
    </>
  );
}
