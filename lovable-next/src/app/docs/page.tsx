"use client";

import { useState } from "react";
import {
  ChevronRight,
  Search,
  BookOpen,
  Repeat,
  QrCode,
  MessageSquare,
  Shield,
  HelpCircle,
} from "lucide-react";
import { SectionWrapper } from "@/components/layout/SectionWrapper";
import { Card, CardContent } from "@/components/Card";
import { cn } from "@/lib/utils";
import { malinton } from "@/app/fonts";

const sections = [
  {
    id: "overview",
    icon: BookOpen,
    title: "What is KeyWe Pay?",
    content: `KeyWe Pay is a Stellar-based swap aggregator and payment platform that combines the simplicity of UPI-style payments with the power of decentralized finance.

**Key Features:**
- Best-price swap routing across Stellar DEXs
- QR-based instant payments
- SMS swap commands (Phase 2)
- Non-custodial — you always control your keys

**Built on Stellar:**
KeyWe Pay leverages Stellar's fast, low-cost network to provide near-instant settlements and minimal transaction fees.`,
  },
  {
    id: "swaps",
    icon: Repeat,
    title: "How Swaps Work",
    content: `KeyWe Pay finds the optimal swap route for your trade using Stellar's pathfinding capabilities.

**Swap Process:**
1. Select your source and destination assets
2. Enter the amount you want to swap
3. Review the quote and route
4. Confirm the transaction

**Route Optimization:**
Our aggregator compares rates across multiple liquidity sources on Stellar to ensure you get the best price for your swap.

**Slippage Protection:**
Set your slippage tolerance to protect against price movements during execution.`,
  },
  {
    id: "qr-payments",
    icon: QrCode,
    title: "QR Payment Flow",
    content: `QR payments work like UPI — scan, enter amount, done.

**Receiving Payments:**
1. Go to the Pay page and select "Generate"
2. Your wallet address QR is displayed
3. Optionally add a memo for reference
4. Share the QR or let others scan it

**Sending Payments:**
1. Select "Scan & Pay" on the Pay page
2. Point your camera at a KeyWe QR code
3. Enter the amount to send
4. Confirm the payment

Payments settle in seconds thanks to Stellar's fast finality.`,
  },
  {
    id: "sms-swaps",
    icon: MessageSquare,
    title: "SMS Swap Design",
    content: `SMS swaps allow you to execute trades via text message — no app required.

**How It Works:**
1. Register your phone number with KeyWe Pay
2. Link your wallet to your phone number
3. Send SMS commands like: \`SWAP 10 XLM TO USDC\`
4. Receive confirmation via SMS

**Command Format:**
\`SWAP [amount] [from_asset] TO [to_asset]\`

**Coming in Phase 2:**
This feature is currently under development. Sign up to be notified when it launches.`,
  },
  {
    id: "security",
    icon: Shield,
    title: "Security & Custody",
    content: `KeyWe Pay is designed with security as a priority.

**Non-Custodial:**
We never hold or control your private keys. All transactions are signed locally in your wallet.

**Wallet Support:**
Currently, we support Freighter wallet — a trusted Stellar wallet extension.

**SMS Security:**
- Private keys are NEVER transmitted via SMS
- Phone number verification required
- Optional 2FA for large transactions
- Daily transaction limits

**Best Practices:**
- Always verify transaction details before signing
- Keep your Freighter wallet secure
- Never share your recovery phrase`,
  },
  {
    id: "faq",
    icon: HelpCircle,
    title: "FAQs",
    content: `**What wallets are supported?**
Currently, KeyWe Pay supports Freighter wallet. More wallets coming soon.

**What assets can I swap?**
Any asset available on the Stellar network can be swapped, as long as there's liquidity.

**Are there any fees?**
KeyWe Pay charges no additional fees. You only pay Stellar network fees (~0.00001 XLM per operation).

**Is my wallet safe?**
Yes. KeyWe Pay is non-custodial — we never access your private keys.

**How fast are transactions?**
Stellar transactions typically settle in 3-5 seconds.

**Can I use KeyWe Pay on mobile?**
Yes, the web app is fully responsive and works on mobile browsers.`,
  },
];

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredSections = sections.filter(
    (section) =>
      section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      section.content.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const currentSection = sections.find((s) => s.id === activeSection);

  return (
    <main className="w-full pb-16 min-h-screen">
      <SectionWrapper>
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className={cn("text-3xl font-bold mb-4", malinton.className)}>Documentation</h1>
            <p className="text-muted-foreground max-w-md mx-auto">
              Everything you need to know about KeyWe Pay
            </p>
          </div>

          {/* Search */}
          <div className="relative max-w-md mx-auto mb-12">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search documentation..."
              className="input-fintech pl-12"
            />
          </div>

          <div className="grid lg:grid-cols-4 gap-8">
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <nav className="space-y-1 sticky top-32">
                {filteredSections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors",
                      activeSection === section.id
                        ? "bg-foreground text-background"
                        : "hover:bg-secondary",
                    )}
                  >
                    <section.icon className="w-5 h-5" />
                    <span className={cn("font-medium text-sm", malinton.className)}>{section.title}</span>
                    <ChevronRight
                      className={cn(
                        "rotate-0 w-4 h-4 ml-auto transition-transform",
                        activeSection === section.id && "rotate-90",
                      )}
                    />
                  </button>
                ))}
              </nav>
            </div>

            {/* Content */}
            <div className="lg:col-span-3">
              {currentSection && (
                <Card variant="glass" glowEffect className="animate-fade-in">
                  <CardContent className="p-8">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                        <currentSection.icon className="w-6 h-6" />
                      </div>
                      <h2 className={cn("text-2xl font-bold", malinton.className)}>
                        {currentSection.title}
                      </h2>
                    </div>

                    <div className="prose prose-neutral dark:prose-invert max-w-none">
                      {currentSection.content
                        .split("\n\n")
                        .map((paragraph, index) => {
                          if (
                            paragraph.startsWith("**") &&
                            paragraph.endsWith("**")
                          ) {
                            return (
                              <h3
                                key={index}
                                className="text-lg font-semibold mt-6 mb-3"
                              >
                                {paragraph.slice(2, -2)}
                              </h3>
                            );
                          }
                          if (paragraph.startsWith("**")) {
                            const [title, ...rest] = paragraph.split(":**");
                            return (
                              <div key={index} className="mt-4">
                                <strong>{title.slice(2)}:</strong>
                                <span className="text-muted-foreground">
                                  {rest.join(":**")}
                                </span>
                              </div>
                            );
                          }
                          if (
                            paragraph.startsWith("-") ||
                            paragraph.startsWith("1.")
                          ) {
                            return (
                              <ul
                                key={index}
                                className="list-disc list-inside space-y-1 text-muted-foreground"
                              >
                                {paragraph.split("\n").map((item, i) => (
                                  <li key={i}>
                                    {item.replace(/^[-\d.]\s*/, "")}
                                  </li>
                                ))}
                              </ul>
                            );
                          }
                          if (paragraph.includes("`")) {
                            const parts = paragraph.split("`");
                            return (
                              <p
                                key={index}
                                className="text-muted-foreground leading-relaxed"
                              >
                                {parts.map((part, i) =>
                                  i % 2 === 0 ? (
                                    part
                                  ) : (
                                    <code
                                      key={i}
                                      className="px-2 py-1 rounded bg-secondary font-mono text-sm"
                                    >
                                      {part}
                                    </code>
                                  ),
                                )}
                              </p>
                            );
                          }
                          return (
                            <p
                              key={index}
                              className="text-muted-foreground leading-relaxed"
                            >
                              {paragraph}
                            </p>
                          );
                        })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </SectionWrapper>
    </main>
  );
}
