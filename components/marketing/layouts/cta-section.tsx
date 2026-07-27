"use client";

import NextLink from "next/link";
import Image from "next/image";
import { Link as HeroLink } from "@heroui/link";

import MagnetLines from "@/components/ui/magnet-lines";
import SlackShotsLogo from "@/public/SSLOGO_NOBG.png";

export function CTASection() {
  return (
    <section className="relative flex items-center justify-center py-20">
      <div className="absolute mx-auto inset-0 blur w-max -z-10 border justify-justify-center self-center">
        <MagnetLines />
      </div>
      <div className="mx-auto max-w-2xl py-16 px-4 text-center sm:py-20 sm:px-6 lg:px-8 z-50">
        <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl ">
          <span className="block text-slate-900/90 dark:text-slate-200/90">
            Ready to dive in?
          </span>
          <span className="block text-slate-900/90 dark:text-slate-200/90">
            Start your free trial today.
          </span>
        </h2>
        <p className="mt-4 text-lg leading-6 text-slate-900/90 dark:text-slate-200/90">
          No credit card required.
        </p>
        <HeroLink
          as={NextLink}
          className="mx-auto drop-shadow-lg w-60 rounded-lg px-6 py-2 mt-4 gap-1 text-slate-900/90 font-semibold border border-zinc-400/40 bg-white group relative flex items-center justify-center shadow-[inset_0_-8px_10px_#8fdfff1f] transition-shadow duration-500 ease-out hover:shadow-[inset_0_-5px_10px_#8fdfff3f] whitespace-nowrap"
          href="/dashboard"
        >
          <Image alt="Slack Logo" height={30} src={SlackShotsLogo} width={30} />
          Get Started
        </HeroLink>
      </div>
    </section>
  );
}
