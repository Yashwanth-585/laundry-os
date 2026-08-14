"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const slides = [
    {
        src: "/hero/wash-fold.jpg",
        title: "Wash & Fold",
        description: "Freshly washed and neatly folded with care.",
    },
    {
        src: "/hero/pickup-delivery.png",
        title: "Pickup & Delivery",
        description: "Convenient doorstep pickup and delivery.",
    },
    {
        src: "/hero/fabric-care.jpg",
        title: "Professional Fabric Care",
        description:
            "Specialized care for your everyday and delicate garments.",
    },
    {
        src: "/hero/ironing-pressing.jpg",
        title: "Ironing & Pressing",
        description: "Crisp, wrinkle-free finishing for your clothes.",
    },
    {
        src: "/hero/fresh-laundry.jpg",
        title: "Fresh Laundry",
        description: "Clean, fresh and ready to wear.",
    },
];

export function HeroSlideshow() {
    const [activeIndex, setActiveIndex] = useState(0);
    const [previousIndex, setPreviousIndex] = useState<number | null>(null);

    useEffect(() => {
        const interval = setInterval(() => {
            setPreviousIndex(activeIndex);

            setActiveIndex((current) => (current + 1) % slides.length);
        }, 4500);

        return () => clearInterval(interval);
    }, [activeIndex]);

    const activeSlide = slides[activeIndex];

    return (
        <div className="relative w-full">
            {/* Ambient color wash behind the card */}
            <div className="pointer-events-none absolute -inset-5 -z-10 rounded-[36px] bg-gradient-to-br from-brand-blue-deep/15 via-transparent to-brand-orange/15 blur-2xl" />

            <div className="relative overflow-hidden rounded-[28px] shadow-xl ring-1 ring-slate-900/5">
                <div className="relative aspect-[4/5] w-full sm:aspect-[4/4.5]">
                    {/* Previous image */}
                    {previousIndex !== null && (
                        <div className="absolute inset-0">
                            <Image
                                src={slides[previousIndex].src}
                                alt=""
                                fill
                                sizes="(max-width: 1024px) 100vw, 42vw"
                                className="object-cover"
                            />
                        </div>
                    )}

                    {/* Current image */}
                    <div
                        key={activeIndex}
                        className="absolute inset-0 animate-[heroFadeIn_1000ms_ease-in-out_forwards]"
                    >
                        <Image
                            src={activeSlide.src}
                            alt={activeSlide.title}
                            fill
                            priority={activeIndex === 0}
                            sizes="(max-width: 1024px) 100vw, 42vw"
                            className="object-cover"
                        />
                    </div>

                    {/* Legibility scrim */}
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-slate-950/75 via-slate-950/25 to-transparent" />

                    {/* Garment-tag corner accent */}
                    <div className="absolute left-4 top-4 hidden items-center gap-1.5 rounded-full border border-dashed border-white/40 bg-white/10 py-1 pl-1.5 pr-3 backdrop-blur-sm sm:flex">
                        <span className="flex size-4 items-center justify-center rounded-full bg-white/90">
                            <span className="size-1.5 rounded-full bg-brand-orange" />
                        </span>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-white">
                            WashLand
                        </span>
                    </div>

                    {/* Caption + indicators */}
                    <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                        <h2 className="text-xl font-bold text-white sm:text-2xl">
                            {activeSlide.title}
                        </h2>

                        <p className="mt-1.5 max-w-sm text-xs leading-5 text-white/80 sm:text-sm">
                            {activeSlide.description}
                        </p>

                        <div className="mt-4 flex items-center gap-1.5">
                            {slides.map((slide, index) => (
                                <button
                                    key={slide.src}
                                    type="button"
                                    onClick={() => {
                                        setPreviousIndex(activeIndex);
                                        setActiveIndex(index);
                                    }}
                                    aria-label={`Show ${slide.title}`}
                                    aria-current={index === activeIndex}
                                    className={`h-1 rounded-full transition-all duration-1000 ease-in-out ${index === activeIndex
                                        ? "w-8 bg-white"
                                        : "w-3 bg-white/35 hover:bg-white/60"
                                        }`}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <style jsx>{`
                @keyframes heroFadeIn {
                    from {
                        opacity: 0;
                    }
 
                    to {
                        opacity: 1;
                    }
                }
            `}</style>
        </div>
    );
}

