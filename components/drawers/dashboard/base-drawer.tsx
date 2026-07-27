"use client";

import { useEffect, useState, RefObject } from "react";
import { Button } from "@heroui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  DrawerFooter,
} from "@heroui/drawer";

import { DrawerPlacement, useDrawerStore } from "@/stores/drawer-store";

interface BaseDrawerProps {
  containerRef: RefObject<HTMLDivElement>;
}

export function BaseDrawer({ containerRef }: BaseDrawerProps) {
  const isOpen = useDrawerStore((state) => state.isOpen);
  const content = useDrawerStore((state) => state.content);
  const config = useDrawerStore((state) => state.config);
  const closeDrawer = useDrawerStore((state) => state.closeDrawer);

  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (containerRef.current) {
      requestAnimationFrame(() => setIsReady(true));
    }
  }, [containerRef]);

  const {
    placement = "right",
    title,
    size,
    hideCloseButton = false,
    hideFooter = false,
    backdrop = "opaque",
    isDismissable = true,
  } = config;

  const getShadowClasses = (placement: DrawerPlacement) => {
    const shadows = {
      right: "shadow-well-right-lg dark:shadow-well-dark-right-lg",
      left: "shadow-well-left-lg dark:shadow-well-dark-left-lg",
      top: "shadow-well-top-lg dark:shadow-well-dark-top-lg",
      bottom: "shadow-well-bottom-lg dark:shadow-well-dark-bottom-lg",
    };

    return shadows[placement] || "shadow-well-lg dark:shadow-well-dark-lg";
  };

  const setIsAnimating = useDrawerStore((state) => state.setIsAnimating);

  const drawerMotionProps = {
    initial: {
      ...(placement === "right" ? { x: 450 } : {}),
      ...(placement === "left" ? { x: -450 } : {}),
      ...(placement === "top" ? { y: -450 } : {}),
      ...(placement === "bottom" ? { y: 450 } : {}),
      filter: "blur(8px)",
      opacity: 0.9,
    },
    animate: {
      x: 0,
      y: 0,
      opacity: 1,
      filter: "blur(0px)",
      transition: {
        filter: { duration: 0.15 },
        default: { type: "spring", stiffness: 450, damping: 28, mass: 0.9 },
      },
    },
    exit: {
      ...(placement === "right" ? { x: 450 } : {}),
      ...(placement === "left" ? { x: -450 } : {}),
      ...(placement === "top" ? { y: -450 } : {}),
      ...(placement === "bottom" ? { y: 450 } : {}),
      filter: "blur(4px)",
      transition: {
        filter: { duration: 0.1 },
        default: { type: "spring", stiffness: 500, damping: 25, mass: 0.7 },
      },
    },
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 28,
      mass: 1,
    },
    onAnimationStart: () => setIsAnimating(true),
    onAnimationComplete: () => setIsAnimating(false),
  };

  if (!containerRef.current || !isReady) return null;

  return (
    <>
      <Drawer
        backdrop={backdrop}
        classNames={{
          wrapper: "absolute w-full h-full",
          backdrop: "absolute w-full h-full",
          base: "z-50",
        }}
        hideCloseButton={hideCloseButton}
        isDismissable={isDismissable}
        isOpen={isOpen}
        motionProps={drawerMotionProps}
        placement={placement}
        portalContainer={containerRef.current}
        size={size}
        onOpenChange={(open) => {
          if (!open) closeDrawer();
        }}
      >
        <DrawerContent
          className={`bg-zinc-100 dark:bg-zinc-800 flex flex-col ${getShadowClasses(placement)} transform-gpu will-change-transform`}
        >
          {title && <DrawerHeader>{title}</DrawerHeader>}
          <DrawerBody>{content}</DrawerBody>
          {!hideFooter && (
            <DrawerFooter>
              <Button onPress={closeDrawer}>Close</Button>
            </DrawerFooter>
          )}
        </DrawerContent>
      </Drawer>
    </>
  );
}
