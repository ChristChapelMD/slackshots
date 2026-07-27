"use client";

import { ArrowRight } from "@phosphor-icons/react";
import { motion } from "framer-motion";
import { Link as HeroLink } from "@heroui/link";
import NextLink from "next/link";
import Image from "next/image";

import { MediaPlayer } from "@/components/ui/media-player";
import SlackShotsLogo from "@/public/SSLOGO_NOBG.png";
import WaveReveal from "@/components/ui/wave-reveal";

export function HeroSection() {
  return (
    <section className="relative mx-auto flex max-w-7xl flex-col items-center justify-center">
      <div className="px-4">
        <h1 className="relative z-10 mx-auto max-w-4xl text-center font-bold text-slate-900/90 dark:text-slate-200/90 text-8xl md:text-7xl lg:text-9xl">
          <WaveReveal delay={200} text="SlackShots" />
        </h1>
        <motion.p
          animate={{
            opacity: 1,
          }}
          className="relative z-10 mx-auto max-w-xl py-4 text-center text-lg font-normal text-neutral-600 dark:text-neutral-400"
          initial={{
            opacity: 0,
          }}
          transition={{
            duration: 0.3,
            delay: 0.3,
          }}
        >
          Fast, private, and intelligent file management for Slack — with search
          that actually understands you
        </motion.p>
        <motion.div
          animate={{
            opacity: 1,
          }}
          className="relative z-10 mt-8 flex flex-wrap items-center justify-center gap-4"
          initial={{
            opacity: 0,
          }}
          transition={{
            duration: 0.3,
            delay: 0.5,
          }}
        >
          <HeroLink
            as={NextLink}
            className="drop-shadow-lg w-60 rounded-lg px-6 py-2 gap-1 text-slate-900/90 font-semibold border border-zinc-400/40 bg-white group relative flex items-center justify-center shadow-[inset_0_-8px_10px_#8fdfff1f] transition-shadow duration-500 ease-out hover:shadow-[inset_0_-5px_10px_#8fdfff3f] whitespace-nowrap"
            href="/dashboard"
          >
            <Image
              alt="Slack Logo"
              height={30}
              src={SlackShotsLogo}
              width={30}
            />
            Get Started
          </HeroLink>
          <HeroLink
            as={NextLink}
            className="drop-shadow-lg w-60 rounded-lg px-6 py-3 gap-1 text-foreground font-semibold border border-zinc-400/40 group relative flex items-center justify-center shadow-[inset_0_-8px_10px_#8fdfff1f] transition-shadow duration-500 ease-out hover:shadow-[inset_0_-5px_10px_#8fdfff3f] whitespace-nowrap"
            href="/demo"
          >
            Demo
            <ArrowRight
              className="ml-1 size-4 stroke-neutral-500 transition-transform
           duration-300 ease-in-out group-hover:translate-x-1"
              weight="bold"
            />
          </HeroLink>
        </motion.div>
        <motion.div
          animate={{
            opacity: 1,
            y: 0,
          }}
          className="relative z-10 mt-20 rounded-3xl border border-neutral-200 bg-neutral-100 p-4 shadow-md dark:border-neutral-800 dark:bg-neutral-900"
          initial={{
            opacity: 0,
            y: 25,
          }}
          transition={{
            duration: 0.3,
            delay: 0.7,
          }}
        >
          <motion.div
            animate={{
              opacity: 1,
              y: 0,
            }}
            className="relative z-10 mt-20 rounded-3xl border border-neutral-200 bg-neutral-100 p-4 shadow-md dark:border-neutral-800 dark:bg-neutral-900"
            initial={{
              opacity: 0,
              y: 25,
            }}
            transition={{
              duration: 0.3,
              delay: 0.7,
            }}
          >
            <MediaPlayer />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
