import { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { MainContentContainer } from "@/components/dashboard/main/main-content-container";
import { getServerAuthSession } from "@/lib/auth/server-session";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const session = await getServerAuthSession(await headers());

  if (!session?.user) {
    redirect("/sign-in");
  }

  return <MainContentContainer />;
}
