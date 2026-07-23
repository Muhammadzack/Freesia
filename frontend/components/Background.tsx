export default function Background() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-black">
      <div className="absolute top-[-120px] left-[-120px] h-96 w-96 rounded-full bg-purple-600/30 blur-3xl" />

      <div className="absolute bottom-[-120px] right-[-120px] h-96 w-96 rounded-full bg-indigo-500/30 blur-3xl" />

      <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-fuchsia-500/10 blur-[140px]" />
    </div>
  );
}
