"use client";

import Link from "next/link";
import {
  ArrowRight,
  Repeat,
  QrCode,
  MessageSquare,
  Shield,
  Zap,
  Globe,
} from "lucide-react";
import { SectionWrapper } from "@/components/layout/SectionWrapper";
import { Card, CardContent } from "@/components/Card";
import { cn } from "@/lib/utils";
import { malinton } from "@/app/fonts";

const features = [
  {
    icon: Repeat,
    title: "Best-Price Routing",
    description:
      "Automatically find the best swap route across Stellar DEXs for optimal rates.",
  },
  {
    icon: QrCode,
    title: "QR Payments",
    description:
      "Scan and pay instantly. Generate your own QR to receive payments anywhere.",
  },
  {
    icon: MessageSquare,
    title: "SMS Swaps",
    description:
      "Execute swaps via SMS commands. No app needed. Coming in Phase 2.",
  },
];

const steps = [
  {
    step: "01",
    title: "Connect Wallet",
    description: "Link your Freighter wallet securely with one click.",
  },
  {
    step: "02",
    title: "Choose Action",
    description: "Swap assets or pay someone via QR code instantly.",
  },
  {
    step: "03",
    title: "Confirm & Done",
    description: "Review details and execute. Transactions settle in seconds.",
  },
];

const trustPoints = [
  {
    icon: Shield,
    title: "Non-Custodial",
    description: "Your keys, your crypto. We never hold your funds.",
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Stellar's 5-second finality means instant settlements.",
  },
  {
    icon: Globe,
    title: "Global Access",
    description: "Borderless payments and swaps, anywhere in the world.",
  },
];

export default function LandingPage() {
  return (
    <main className="w-full">
      {/* Hero Section */}
      <SectionWrapper className="pt-12 pb-24">
        <div className="text-center max-w-3xl mx-auto animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-secondary/50 text-sm mb-8">
            <span className="w-2 h-2 rounded-full bg-foreground animate-pulse-subtle" />
            <span>Built on Stellar Network</span>
          </div>

          <h1 className={cn("text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6", malinton.className)}>
            Swap & Pay on Stellar
            <br />
            <span className="text-muted-foreground">as simple as UPI</span>
          </h1>

          <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
            The fastest way to swap assets and send payments. Scan a QR, enter
            an amount, done. No complexity.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/swap" className="btn-fintech-primary w-full sm:w-auto">
              <span className={malinton.className}>Start Swapping</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/pay"
              className="btn-fintech-secondary w-full sm:w-auto"
            >
              <QrCode className="w-4 h-4" />
              Pay via QR
            </Link>
          </div>
        </div>
      </SectionWrapper>

      {/* Features Section */}
      <SectionWrapper id="features" className="py-24">
        <div className="text-center mb-16">
          <h2 className={cn("text-3xl font-bold mb-4", malinton.className)}>Everything you need</h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            A complete toolkit for Stellar payments and swaps.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <Card
              key={feature.title}
              variant="glass"
              glowEffect
              className="animate-slide-up"
              style={
                { animationDelay: `${index * 100}ms` } as React.CSSProperties
              }
            >
              <CardContent className="p-8">
                <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mb-6">
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className={cn("text-xl font-semibold mb-3", malinton.className)}>{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </SectionWrapper>

      {/* How It Works */}
      <SectionWrapper className="py-24 border-y border-border">
        <div className="text-center mb-16">
          <h2 className={cn("text-3xl font-bold mb-4", malinton.className)}>How it works</h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Get started in three simple steps.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <div
              key={step.step}
              className="text-center animate-slide-up"
              style={
                { animationDelay: `${index * 100}ms` } as React.CSSProperties
              }
            >
              <div className="text-6xl font-bold text-muted-foreground/20 mb-4">
                {step.step}
              </div>
              <h3 className={cn("text-xl font-semibold mb-3", malinton.className)}>{step.title}</h3>
              <p className="text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </SectionWrapper>

      {/* Trust & Security */}
      <SectionWrapper className="py-24">
        <div className="text-center mb-16">
          <h2 className={cn("text-3xl font-bold mb-4", malinton.className)}>Built for trust</h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Security and transparency at every step.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {trustPoints.map((point, index) => (
            <Card
              key={point.title}
              variant="elevated"
              className="animate-slide-up"
              style={
                { animationDelay: `${index * 100}ms` } as React.CSSProperties
              }
            >
              <CardContent className="p-8 text-center">
                <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center mx-auto mb-6">
                  <point.icon className="w-7 h-7" />
                </div>
                <h3 className={cn("text-xl font-semibold mb-3", malinton.className)}>{point.title}</h3>
                <p className="text-muted-foreground">{point.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </SectionWrapper>

      {/* CTA Section */}
      <SectionWrapper className="py-24">
        <Card variant="glass" className="p-12 text-center">
          <h2 className={cn("text-3xl font-bold mb-4", malinton.className)}>Ready to get started?</h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            Connect your wallet and experience the future of Stellar payments.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/wallet" className="btn-fintech-primary">
              Connect Wallet
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/docs" className="btn-fintech-ghost">
              Read the Docs
            </Link>
          </div>
        </Card>
      </SectionWrapper>
    </main>
  );
}
