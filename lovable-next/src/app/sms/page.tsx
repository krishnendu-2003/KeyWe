import {
  MessageSquare,
  Clock,
  ArrowRight,
  Shield,
  AlertTriangle,
} from "lucide-react";
import { SectionWrapper } from "@/components/layout/SectionWrapper";
import { Card, CardContent } from "@/components/Card";
import { cn } from "@/lib/utils";
import { malinton } from "@/app/fonts";

const smsExamples = [
  {
    command: "SWAP 10 XLM TO USDC",
    description: "Swap 10 XLM for USDC at the best available rate",
  },
  {
    command: "SWAP 50 USDC TO XLM",
    description: "Convert 50 USDC to Stellar Lumens",
  },
  {
    command: "SWAP 100 XLM TO EURC",
    description: "Exchange 100 XLM for Euro stablecoin",
  },
];

const howItWorks = [
  {
    step: "01",
    title: "Send SMS Command",
    description:
      "Text your swap command to our designated number from your registered phone.",
  },
  {
    step: "02",
    title: "Route Discovery",
    description:
      "Our backend finds the optimal swap route across Stellar DEXs.",
  },
  {
    step: "03",
    title: "Execution",
    description: "The swap is executed and you receive a confirmation SMS.",
  },
];

export default function SmsPage() {
  return (
    <main className="w-full pb-16 min-h-screen">
      <SectionWrapper>
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-secondary/50 text-sm mb-6">
              <Clock className="w-4 h-4" />
              Coming in Phase 2
            </div>
            <h1 className={cn("text-3xl font-bold mb-4", malinton.className)}>SMS Swaps</h1>
            <p className="text-muted-foreground max-w-md mx-auto">
              Execute swaps via simple text commands. No app required.
            </p>
          </div>

          {/* SMS Examples */}
          <Card variant="glass" glowEffect className="mb-8">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-semibold">Example Commands</h2>
              </div>

              <div className="space-y-4">
                {smsExamples.map((example, index) => (
                  <div key={index} className="p-4 bg-secondary rounded-xl">
                    <code className="text-lg font-mono font-semibold block mb-2">
                      {example.command}
                    </code>
                    <p className="text-sm text-muted-foreground">
                      {example.description}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* How It Works */}
          <Card variant="elevated" className="mb-8">
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-6">How It Works</h2>

              <div className="space-y-6">
                {howItWorks.map((step, index) => (
                  <div key={step.step} className="flex gap-4">
                    <div className="text-3xl font-bold text-muted-foreground/30">
                      {step.step}
                    </div>
                    <div className="flex-1 pt-1">
                      <h3 className="font-semibold mb-1">{step.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {step.description}
                      </p>
                    </div>
                    {index < howItWorks.length - 1 && (
                      <ArrowRight className="w-5 h-5 text-muted-foreground/30 mt-2 hidden sm:block" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Security Notice */}
          <Card variant="glass" className="mb-8">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Security Model</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-foreground mt-2" />
                      Private keys are NEVER transmitted via SMS
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-foreground mt-2" />
                      Phone number must be registered and verified
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-foreground mt-2" />
                      Optional confirmation step for large swaps
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-foreground mt-2" />
                      Daily limits to protect against unauthorized access
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Phase Notice */}
          <div className="flex items-start gap-3 p-4 rounded-xl border border-border bg-card">
            <AlertTriangle className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="font-medium text-sm">Phase 2 Feature</p>
              <p className="text-xs text-muted-foreground">
                SMS swap execution is under development. Sign up to be notified
                when it launches.
              </p>
            </div>
          </div>

          {/* Notify CTA */}
          <div className="mt-8 text-center">
            <button className="btn-fintech-primary">
              Notify Me When Available
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </SectionWrapper>
    </main>
  );
}
