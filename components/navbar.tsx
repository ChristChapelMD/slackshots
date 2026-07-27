import {
  Navbar as HeroUINavbar,
  NavbarContent,
  NavbarMenu,
  NavbarMenuToggle,
  NavbarBrand,
  NavbarItem,
  NavbarMenuItem,
} from "@heroui/navbar";
import { Button } from "@heroui/button";
import { Link } from "@heroui/link";
import { link as linkStyles } from "@heroui/theme";
import NextLink from "next/link";
import clsx from "clsx";
import Image from "next/image";

import { siteConfig } from "@/config/site";
import { ThemeSwitch } from "@/components/theme-switch";
import { GithubIcon } from "@/components/icons";
import SlackShotsLogo from "@/public/SSLOGO_NOBG.png";

export const Navbar = () => {
  return (
    <HeroUINavbar className="pt-4" maxWidth="xl" position="sticky">
      <NavbarContent className="basis-1/5 sm:basis-full" justify="start">
        <NavbarBrand as="li" className="gap-3 max-w-fit">
          <NextLink className="flex justify-start items-center gap-1" href="/">
            <Image
              alt="SlackShots Logo"
              height={40}
              loading="eager"
              src={SlackShotsLogo}
              width={40}
            />
            <p className="hidden md:block font-bold text-2xl tracking-tighter text-slate-900/90 dark:text-slate-200/90">
              SlackShots
            </p>
          </NextLink>
        </NavbarBrand>
      </NavbarContent>

      <NavbarContent
        className="hidden sm:flex basis-1/5 sm:basis-full"
        justify="end"
      >
        <ul className="hidden lg:flex gap-4 justify-start mr-8">
          {siteConfig.navItems.map((item) => (
            <NavbarItem key={item.href}>
              <NextLink
                className={clsx(
                  linkStyles({ color: "foreground" }),
                  "data-[active=true]:text-primary data-[active=true]:font-medium text-slate-900/90 dark:text-slate-200/90",
                )}
                color="foreground"
                href={item.href}
              >
                {item.label}
              </NextLink>
            </NavbarItem>
          ))}
        </ul>
        <NavbarItem className="hidden sm:flex gap-2">
          <Link isExternal aria-label="Github" href={siteConfig.links.github}>
            <GithubIcon className="text-default-500" />
          </Link>
          <ThemeSwitch />
        </NavbarItem>
        <NavbarItem className="hidden md:flex gap-2">
          <Button
            as={Link}
            className="drop-shadow-lg rounded-lg px-6 py-3 gap-1 font-semibold bg-zinc-950 text-white border border-zinc-400/40 group relative flex items-center justify-center shadow-[inset_0_-8px_10px_#8fdfff1f] transition-shadow duration-500 ease-out hover:shadow-[inset_0_-5px_10px_#8fdfff3f] whitespace-nowrap"
            href="/dashboard"
            variant="flat"
          >
            Dashboard
          </Button>
          <Button
            as={Link}
            className="drop-shadow-lg rounded-lg px-6 py-2 gap-1 text-slate-900/90 font-semibold border border-zinc-400/40 bg-white group relative flex items-center justify-center shadow-[inset_0_-8px_10px_#8fdfff1f] transition-shadow duration-500 ease-out hover:shadow-[inset_0_-5px_10px_#8fdfff3f] whitespace-nowrap"
            href="/docs"
            variant="flat"
          >
            Docs
          </Button>
        </NavbarItem>
      </NavbarContent>

      <NavbarContent className="sm:hidden basis-1 pl-4" justify="end">
        <Link isExternal aria-label="Github" href={siteConfig.links.github}>
          <GithubIcon className="text-default-500" />
        </Link>
        <ThemeSwitch />
        <NavbarMenuToggle />
      </NavbarContent>

      <NavbarMenu>
        <div className="mx-4 mt-2 py-16 flex h-full flex-col justify-between">
          <div className="flex flex-col gap-2">
            {siteConfig.navMenuItems.map((item, index) => (
              <NavbarMenuItem key={`${item}-${index}`}>
                <Link
                  className="font-semibold text-slate-900/90 dark:text-slate-200/90"
                  href="#"
                  size="lg"
                >
                  {item.label}
                </Link>
              </NavbarMenuItem>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            <NavbarMenuItem className="w-full">
              <Button
                as={Link}
                className="drop-shadow-lg rounded-lg px-6 py-3 gap-1 font-semibold bg-zinc-950 text-white border border-zinc-400/40 group relative flex items-center justify-center shadow-[inset_0_-8px_10px_#8fdfff1f] transition-shadow duration-500 ease-out hover:shadow-[inset_0_-5px_10px_#8fdfff3f] whitespace-nowrap"
                href="/dashboard"
                variant="flat"
              >
                Dashboard
              </Button>
            </NavbarMenuItem>

            <NavbarMenuItem className="w-full">
              <Button
                as={Link}
                className="drop-shadow-lg rounded-lg px-6 py-2 gap-1 text-slate-900/90 font-semibold border border-zinc-400/40 bg-white group relative flex items-center justify-center shadow-[inset_0_-8px_10px_#8fdfff1f] transition-shadow duration-500 ease-out hover:shadow-[inset_0_-5px_10px_#8fdfff3f] whitespace-nowrap"
                href="/docs"
                variant="flat"
              >
                Docs
              </Button>
            </NavbarMenuItem>
          </div>
        </div>
      </NavbarMenu>
    </HeroUINavbar>
  );
};
