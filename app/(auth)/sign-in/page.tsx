import Image from "next/image";
import { Card } from "@heroui/card";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

import SlackShotsLogo from "@/public/SSLOGO_NOBG.png";
import { SlackAuthButton } from "@/components/auth/slack-auth-button";
import { getServerAuthSession } from "@/lib/auth/server-session";

export default async function SignInPage() {
  const session = await getServerAuthSession(await headers());

  if (session) {
    redirect("/dashboard");
  }

  return (
    <Card className="relative flex w-full max-w-sm flex-col gap-6 overflow-hidden rounded-2xl border border-zinc-400/25 p-8 shadow-[inset_0_-8px_10px_#8fdfff1f] drop-shadow-lg">
      <Image
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-16 opacity-20 blur-3xl"
        height={400}
        src={SlackShotsLogo}
        width={400}
      />
      <div className="relative z-10 text-center">
        <Image
          priority
          alt="SlackShots"
          className="pointer-events-none mx-auto"
          height={80}
          src={SlackShotsLogo}
          width={80}
        />
        <h1 className="mt-3 text-3xl font-extrabold">Welcome to SlackShots</h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Sign in with a member account from your Slack workspace.
        </p>
      </div>
      <div className="relative z-10">
        <SlackAuthButton />
      </div>
    </Card>
  );
}
