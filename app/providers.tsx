"use client";

import type { ThemeProviderProps } from "next-themes";

import { useEffect } from "react";
import { HeroUIProvider } from "@heroui/system";
import { usePathname, useRouter } from "next/navigation";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export interface ProvidersProps {
  children: React.ReactNode;
  themeProps?: ThemeProviderProps;
}

declare module "@react-types/shared" {
  interface RouterConfig {
    routerOptions: NonNullable<
      Parameters<ReturnType<typeof useRouter>["push"]>[1]
    >;
  }
}

export function Providers({ children, themeProps }: ProvidersProps) {
  const router = useRouter();

  return (
    <HeroUIProvider navigate={router.push}>
      <NextThemesProvider {...themeProps}>{children}</NextThemesProvider>
      <Analytics />
    </HeroUIProvider>
  );
}

function Analytics() {
  const pathname = usePathname();

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;

    if (!key) return;

    let cancelled = false;

    const loadAnalytics = async () => {
      const { default: posthog } = await import("posthog-js");

      if (cancelled) return;

      if (!posthog.__loaded) {
        posthog.init(key, {
          api_host:
            process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
          person_profiles: "identified_only",
          capture_pageview: false,
        });
      }

      const query = window.location.search.replace(/^\?/, "");
      const currentUrl = `${window.origin}${pathname}${query ? `?${query}` : ""}`;

      posthog.capture("$pageview", { $current_url: currentUrl });
    };

    const timeoutId = window.setTimeout(loadAnalytics, 1_000);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [pathname]);

  return null;
}
