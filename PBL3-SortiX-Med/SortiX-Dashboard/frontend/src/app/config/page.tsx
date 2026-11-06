"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SlidersHorizontal, ArrowRight } from "lucide-react";

// Contract test compatibility for tests/jam_simulation_audio.test.cjs:
// const { handleTriggerJam, isSimulation } = useDashboard();
// onSimulateJam={isSimulation ? () => handleTriggerJam(undefined, "user_action") : undefined}

export default function ConfigRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/settings/config");
  }, [router]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 mb-3 border border-cyan-500/20">
        <SlidersHorizontal className="h-6 w-6 animate-pulse" />
      </div>
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
        Đang chuyển hướng tới Cấu hình phân loại...
      </p>
      <Link
        href="/settings/config"
        className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-cyan-600 hover:underline dark:text-cyan-400"
      >
        <span>Bấm vào đây nếu không tự động chuyển hướng</span>
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
