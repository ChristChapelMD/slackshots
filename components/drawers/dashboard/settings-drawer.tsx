"use client";

import { useRouter } from "next/navigation";
import { Button } from "@heroui/button";
import { Divider } from "@heroui/divider";
import { User } from "@heroui/user";
import { useTheme } from "next-themes";
import {
  GridFour,
  Monitor,
  Moon,
  SignOut,
  SlackLogo,
  Sun,
} from "@phosphor-icons/react";

import { useAuth } from "@/hooks/use-auth";
import { useWorkspace } from "@/hooks/use-workspace";
import { useUIStore } from "@/stores/ui-store";
import { useDrawerStore } from "@/stores/drawer-store";

type ThemeChoice = "light" | "dark" | "system";
type GridDensity = "lo" | "md" | "hi";

const themeChoices: {
  value: ThemeChoice;
  label: string;
  icon: typeof Sun;
}[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

const densityChoices: { value: GridDensity; label: string; columns: number }[] =
  [
    { value: "lo", label: "Comfortable", columns: 2 },
    { value: "md", label: "Balanced", columns: 3 },
    { value: "hi", label: "Compact", columns: 4 },
  ];

export function SettingsDrawer() {
  const router = useRouter();
  const { session, signOut } = useAuth();
  const isLocalDev = process.env.NEXT_PUBLIC_LOCAL_DEV_AUTH_BYPASS === "true";
  const { currentWorkspace } = useWorkspace();
  const closeDrawer = useDrawerStore((state) => state.closeDrawer);
  const gridDensity = useUIStore((state) => state.gridDensity);
  const setGridDensity = useUIStore((state) => state.setGridDensity);
  const { theme = "system", setTheme } = useTheme();

  const handleSignOut = async () => {
    await signOut();
    closeDrawer();
    router.replace("/sign-in");
    router.refresh();
  };

  return (
    <div className="space-y-6 p-2 pb-6">
      <section className="space-y-4">
        <User
          avatarProps={{
            src: session?.user.image || undefined,
            name:
              session?.user.name ||
              (isLocalDev ? "Local developer" : "Slack member"),
            size: "lg",
            className: "border-2 border-primary-300 dark:border-primary-700",
          }}
          classNames={{
            base: "justify-start",
            name: "text-lg font-semibold",
            description: "text-sm text-zinc-500 dark:text-zinc-400",
          }}
          description={
            session?.user.email ||
            (isLocalDev ? "Development sign-in bypass" : "Signed in with Slack")
          }
          name={
            session?.user.name ||
            (isLocalDev ? "Local developer" : "Slack member")
          }
        />
        {isLocalDev ? (
          <p className="rounded-xl bg-primary-50 px-3 py-2 text-xs text-primary-700 dark:bg-primary-950/40 dark:text-primary-300">
            Slack sign-in is skipped while running locally.
          </p>
        ) : (
          <Button
            className="w-full justify-center"
            color="danger"
            startContent={<SignOut size={18} />}
            variant="flat"
            onPress={handleSignOut}
          >
            Sign out
          </Button>
        )}
      </section>

      <Divider />

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <SlackLogo className="text-primary-500" size={20} />
          <h3 className="font-semibold">Workspace</h3>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
          <p className="font-medium">
            {currentWorkspace?.workspaceName || "No workspace connected"}
          </p>
          {currentWorkspace?.workspaceId ? (
            <p className="mt-1 text-xs text-zinc-500">
              Slack workspace {currentWorkspace.workspaceId}
            </p>
          ) : null}
        </div>
      </section>

      <Divider />

      <section className="space-y-4">
        <h3 className="font-semibold">Appearance</h3>
        <div className="grid grid-cols-3 gap-2">
          {themeChoices.map(({ value, label, icon: Icon }) => (
            <Button
              key={value}
              className="h-auto min-w-0 flex-col gap-2 py-3"
              color={theme === value ? "primary" : "default"}
              variant={theme === value ? "flat" : "bordered"}
              onPress={() => setTheme(value)}
            >
              <Icon size={20} />
              <span className="text-xs">{label}</span>
            </Button>
          ))}
        </div>
      </section>

      <Divider />

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <GridFour className="text-primary-500" size={20} />
          <h3 className="font-semibold">Grid density</h3>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {densityChoices.map(({ value, label, columns }) => (
            <Button
              key={value}
              className="h-auto min-w-0 flex-col gap-2 px-2 py-3"
              color={gridDensity === value ? "primary" : "default"}
              variant={gridDensity === value ? "flat" : "bordered"}
              onPress={() => setGridDensity(value)}
            >
              <span
                className="grid h-7 w-7 gap-0.5"
                style={{
                  gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                }}
              >
                {Array.from({ length: columns * columns }).map((_, index) => (
                  <span
                    key={index}
                    className="rounded-[2px] bg-current opacity-70"
                  />
                ))}
              </span>
              <span className="max-w-full truncate text-[11px]">{label}</span>
            </Button>
          ))}
        </div>
      </section>
    </div>
  );
}
