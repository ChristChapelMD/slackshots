"use client";

import dynamic from "next/dynamic";

import animationData from "@/public/lottie/loader-3QEaG.json";

const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

interface LoadingAnimationProps {
  size?: "micro" | "tiny" | "small" | "medium" | "large";
}

export default function LoadingAnimation({
  size = "medium",
}: LoadingAnimationProps) {
  const sizeClasses = {
    micro: "h-5 w-5",
    tiny: "h-10 w-10",
    small: "w-16 h-16",
    medium: "w-32 h-32",
    large: "w-48 h-48",
  };

  return (
    <div className={sizeClasses[size]}>
      <Lottie autoplay loop animationData={animationData} />
    </div>
  );
}
