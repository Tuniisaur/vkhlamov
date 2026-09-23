"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export default function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  const [mounted, setMounted] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [cursorText, setCursorText] = useState("");
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches) {
      return;
    }
    const timer = setTimeout(() => {
      setMounted(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;

    let mouseX = -100;
    let mouseY = -100;
    let ringX = -100;
    let ringY = -100;
    let animId: number;
    let hasMoved = false;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;

      if (!hasMoved) {
        hasMoved = true;
        ringX = mouseX;
        ringY = mouseY;
        setIsVisible(true);
      }

      // Instant 1:1 hardware translation for central micro-dot (zero latency)
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`;
      }

      // Check if hovering an interactive element or [data-cursor]
      const target = (e.target as HTMLElement | null)?.closest?.(
        "[data-cursor], a, button, input, select, textarea, [role='button'], .cursor-pointer"
      ) as HTMLElement | null;

      if (target) {
        const text = target.getAttribute("data-cursor");
        setCursorText(text || "");
        setIsHovered(true);
      } else {
        setCursorText("");
        setIsHovered(false);
      }
    };

    const handleMouseDown = () => setIsMouseDown(true);
    const handleMouseUp = () => setIsMouseDown(false);
    const handleMouseLeave = () => setIsVisible(false);
    const handleMouseEnter = () => setIsVisible(true);

    // Smooth lerp trailing loop for outer magnetic circle
    const render = () => {
      // 0.22 lerp factor creates an ultra-smooth, luxury magnetic drag
      ringX += (mouseX - ringX) * 0.22;
      ringY += (mouseY - ringY) * 0.22;

      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${ringX}px, ${ringY}px, 0)`;
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("mouseleave", handleMouseLeave);
    document.addEventListener("mouseenter", handleMouseEnter);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("mouseenter", handleMouseEnter);
    };
  }, [mounted]);

  if (!mounted) return null;

  const cursorContent = (
    <div
      className={`fixed inset-0 pointer-events-none z-[99999] overflow-hidden select-none transition-opacity duration-300 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
      aria-hidden="true"
    >
      {/* 1. Ultra-sharp Central Micro-Dot (Immediate 1:1 zero latency, high-contrast) */}
      <div
        ref={dotRef}
        className="fixed top-0 left-0 -ml-1 -mt-1 w-2 h-2 rounded-full bg-white pointer-events-none mix-blend-difference will-change-transform"
      />

      {/* 2. Fluid Magnetic Outer Ring (Lerp smooth follower, never obscures text) */}
      <div
        ref={ringRef}
        className="fixed top-0 left-0 pointer-events-none transition-[width,height,margin] duration-300 ease-out will-change-transform"
        style={{
          marginLeft: isHovered ? (cursorText ? "-32px" : "-22px") : "-14px",
          marginTop: isHovered ? (cursorText ? "-16px" : "-22px") : "-14px",
          width: isHovered ? (cursorText ? "64px" : "44px") : "28px",
          height: isHovered ? (cursorText ? "32px" : "44px") : "28px",
        }}
      >
        <div
          className={`w-full h-full rounded-full transition-all duration-300 flex items-center justify-center ${
            isMouseDown ? "scale-90" : "scale-100"
          } ${
            isHovered
              ? cursorText
                ? "rounded-full bg-black/60 border border-white/40 backdrop-blur-md shadow-[0_0_15px_rgba(255,255,255,0.15)]"
                : "border border-white/60 bg-white/[0.06] backdrop-blur-[1px]"
              : "border border-white/35"
          }`}
        >
          {cursorText && (
            <span className="font-mono text-[8px] tracking-[0.2em] font-bold text-white uppercase select-none px-2 py-0.5">
              {cursorText}
            </span>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(cursorContent, document.body);
}
