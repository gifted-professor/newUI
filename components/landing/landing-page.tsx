"use client";

import { useState } from "react";
import { TopBar } from "@/components/landing/top-bar";
import { HeroSection } from "@/components/landing/hero-section";
import { BeforeAfterProof } from "@/components/landing/before-after-proof";
import { TrustSection } from "@/components/landing/trust-section";
import { PricingSection } from "@/components/landing/pricing-section";
import { ConversionModal } from "@/components/landing/conversion-modal";
import { Footer } from "@/components/landing/footer";

export function LandingPage({ isAuthenticated }: { isAuthenticated: boolean }) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  return (
    <div className="relative overflow-x-hidden bg-bg-0">
      <TopBar onCtaClick={openModal} isAuthenticated={isAuthenticated} />
      <main className="pt-[88px] md:pt-[104px]">
        <HeroSection onCtaClick={openModal} />
        <BeforeAfterProof />
        <TrustSection />
        <PricingSection onCtaClick={openModal} />
      </main>
      <Footer />
      <ConversionModal open={isModalOpen} onClose={closeModal} />
    </div>
  );
}
