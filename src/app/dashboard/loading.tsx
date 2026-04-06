export default function DashboardLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="w-10 h-10 border-3 border-[rgba(212,175,55,0.2)] border-t-[#D4AF37] rounded-full animate-spin mb-4" />
      <p className="text-sm text-[#94A3B8]">読み込み中...</p>
    </div>
  );
}
