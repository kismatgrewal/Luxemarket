import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BRAND } from "./media";

/**
 * Full-bleed editorial hero. A single evocative image sits under an ink
 * gradient so the serif headline and gold eyebrow stay legible; two CTAs point
 * shoppers into the catalogue and prospective makers toward onboarding.
 */
export function HeroSection() {
  return (
    <section className="relative isolate overflow-hidden bg-ink text-ivory">
      <div className="absolute inset-0 -z-10">
        <Image
          src={BRAND.hero}
          alt="A curated still life of premium objects"
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-ink/90 via-ink/60 to-ink/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent" />
      </div>

      <div className="container flex min-h-[78vh] flex-col justify-center py-24 md:min-h-[86vh]">
        <div className="max-w-2xl animate-fade-up">
          <span className="eyebrow text-gold-soft">The curated marketplace</span>
          <h1 className="mt-5 font-serif text-4xl font-light leading-[1.05] tracking-tight text-ivory sm:text-6xl md:text-7xl">
            Objects worth
            <span className="block italic text-gold-soft">keeping.</span>
          </h1>
          <p className="mt-6 max-w-lg text-base leading-relaxed text-ivory/75 sm:text-lg">
            A considered edit of watches, leather, and objects for the home — sourced from
            independent makers who put craft before catalogue.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Button asChild variant="gold" size="lg">
              <Link href="/search">
                Explore the edit
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              className="border border-ivory/25 bg-transparent text-ivory hover:bg-ivory/10"
            >
              <Link href="/vendor/apply">Become a maker</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
