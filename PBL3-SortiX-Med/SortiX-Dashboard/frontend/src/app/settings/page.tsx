"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SettingsIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/settings/config");
  }, [router]);

  return (
    <div className="min-h-[400px] flex items-center justify-center text-xs font-medium text-slate-400">
      Đang chuyển hướng tới Cấu hình...
    </div>
  );
}
