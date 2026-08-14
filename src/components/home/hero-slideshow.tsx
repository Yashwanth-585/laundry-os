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
            <div className="relative aspect-[4/3] w-full overflow-hidden">
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

                {/* Extremely subtle edge blending */}
                <div className="pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black_55%,transparent_100%)] bg-slate-50/20" />

                {/* Text */}
                <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                    <p className="text-xs font-semibold uppercase tracking-wider text-brand-blue-deep">
                        WashLand Services
                    </p>

                    <h2 className="mt-1 text-xl font-bold text-brand-navy sm:text-2xl">
                        {activeSlide.title}
                    </h2>

                    <p className="mt-1 max-w-sm text-xs leading-5 text-slate-700 sm:text-sm">
                        {activeSlide.description}
                    </p>
                </div>

                {/* Indicators */}
                <div className="absolute bottom-5 right-5 flex items-center gap-1.5">
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
                            className={`h-1.5 rounded-full transition-all duration-1000 ease-in-out ${index === activeIndex
                                ? "w-7 bg-brand-navy"
                                : "w-1.5 bg-brand-navy/30 hover:bg-brand-navy/60"
                                }`}
                        />
                    ))}
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