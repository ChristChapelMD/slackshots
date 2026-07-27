"use client";

import Image from "next/image";
import { Button } from "@heroui/button";

import SlackLogo from "@/public/SLA-appIcon-desktop.png";
import { useAuth } from "@/hooks/use-auth";

export function SlackAuthButton() {
  const { signInWithSlack, loading } = useAuth();

  return (
    <Button
      className="flex items-center justify-center gap-2 w-full rounded-lg px-4 py-3 text-slate-900 font-medium border border-zinc-300 bg-white shadow-sm hover:shadow-md transition-shadow"
      isLoading={loading}
      onPress={signInWithSlack}
    >
      <Image alt="Slack Logo" height={40} src={SlackLogo} width={40} />
      {loading ? "Authenticating with Slack..." : "Continue with Slack"}
    </Button>
  );
}
