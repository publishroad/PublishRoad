"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  formatUsdFromCents,
  normalizeHireUsPricingConfig,
  type HireUsFaqItem,
  type HireUsPricingConfig,
} from "@/lib/hire-us-config-shared";

function featuresToLines(features: string[]): string {
  return features.join("\n");
}

function linesToFeatures(lines: string): string[] {
  return lines
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 12);
}

export function HireUsPricingEditor({ initialConfig }: { initialConfig: HireUsPricingConfig }) {
  const router = useRouter();
  const [starterPriceCents, setStarterPriceCents] = useState(initialConfig.starter.priceCents);
  const [starterCompareAtPriceCents, setStarterCompareAtPriceCents] = useState<number | null>(initialConfig.starter.compareAtPriceCents);
  const [completePriceCents, setCompletePriceCents] = useState(initialConfig.complete.priceCents);
  const [completeCompareAtPriceCents, setCompleteCompareAtPriceCents] = useState<number | null>(initialConfig.complete.compareAtPriceCents);
  const [starterFeatures, setStarterFeatures] = useState(featuresToLines(initialConfig.starter.includes));
  const [completeFeatures, setCompleteFeatures] = useState(featuresToLines(initialConfig.complete.includes));
  const [faq, setFaq] = useState<HireUsFaqItem[]>(initialConfig.faq);
  const [isSaving, setIsSaving] = useState(false);

  function updateFaqQuestion(index: number, value: string) {
    setFaq((prev) => prev.map((item, i) => (i === index ? { ...item, q: value } : item)));
  }

  function updateFaqAnswer(index: number, value: string) {
    setFaq((prev) => prev.map((item, i) => (i === index ? { ...item, a: value } : item)));
  }

  function addFaq() {
    setFaq((prev) => (prev.length >= 10 ? prev : [...prev, { q: "", a: "" }]));
  }

  function removeFaq(index: number) {
    setFaq((prev) => prev.filter((_, i) => i !== index));
  }

  async function saveConfig() {
    setIsSaving(true);

    const config = normalizeHireUsPricingConfig({
      starter: {
        priceCents: starterPriceCents,
        compareAtPriceCents: starterCompareAtPriceCents,
        includes: linesToFeatures(starterFeatures),
      },
      complete: {
        priceCents: completePriceCents,
        compareAtPriceCents: completeCompareAtPriceCents,
        includes: linesToFeatures(completeFeatures),
      },
      faq,
    });

    const res = await fetch("/api/admin/pricing/hire-us", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ config }),
    });

    setIsSaving(false);

    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      toast.error(payload.error ?? "Failed to save Hire Us pricing");
      return;
    }

    toast.success("Hire Us pricing updated");
    router.refresh();
  }

  return (
    <div className="mt-8 rounded-xl border border-border-gray bg-white p-6">
      <div className="mb-4">
        <p className="font-semibold text-navy">Hire Us Pricing and Features</p>
        <p className="mt-1 text-sm text-medium-gray">
          Edit Starter and Complete package prices and bullets shown in Hire Us package cards.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-3">
          <p className="text-sm font-semibold text-navy">Starter Package</p>
          <div className="space-y-1.5">
            <Label>Price (cents)</Label>
            <Input
              type="number"
              value={starterPriceCents}
              onChange={(e) => setStarterPriceCents(Number(e.target.value || 0))}
            />
            <p className="text-xs text-medium-gray">Offer price: {formatUsdFromCents(starterPriceCents)}</p>
          </div>
          <div className="space-y-1.5">
            <Label>Actual/List Price (cents, optional)</Label>
            <Input
              type="number"
              value={starterCompareAtPriceCents ?? ""}
              onChange={(e) => {
                const raw = e.target.value;
                setStarterCompareAtPriceCents(raw === "" ? null : Number(raw));
              }}
              placeholder="Leave blank to disable"
            />
            <p className="text-xs text-medium-gray">
              Actual/List price: {starterCompareAtPriceCents == null ? "Not set" : formatUsdFromCents(starterCompareAtPriceCents)}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>Features (one per line)</Label>
            <textarea
              value={starterFeatures}
              onChange={(e) => setStarterFeatures(e.target.value)}
              rows={8}
              className="w-full rounded-lg border border-border-gray px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-semibold text-navy">Complete Package</p>
          <div className="space-y-1.5">
            <Label>Price (cents)</Label>
            <Input
              type="number"
              value={completePriceCents}
              onChange={(e) => setCompletePriceCents(Number(e.target.value || 0))}
            />
            <p className="text-xs text-medium-gray">Offer price: {formatUsdFromCents(completePriceCents)}</p>
          </div>
          <div className="space-y-1.5">
            <Label>Actual/List Price (cents, optional)</Label>
            <Input
              type="number"
              value={completeCompareAtPriceCents ?? ""}
              onChange={(e) => {
                const raw = e.target.value;
                setCompleteCompareAtPriceCents(raw === "" ? null : Number(raw));
              }}
              placeholder="Leave blank to disable"
            />
            <p className="text-xs text-medium-gray">
              Actual/List price: {completeCompareAtPriceCents == null ? "Not set" : formatUsdFromCents(completeCompareAtPriceCents)}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>Features (one per line)</Label>
            <textarea
              value={completeFeatures}
              onChange={(e) => setCompleteFeatures(e.target.value)}
              rows={8}
              className="w-full rounded-lg border border-border-gray px-3 py-2 text-sm"
            />
          </div>
        </div>
      </div>

      <div className="mt-5">
        <Button className="bg-navy hover:bg-blue" onClick={saveConfig} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save Hire Us Pricing"}
        </Button>
      </div>

      <div className="mt-8 border-t border-border-gray pt-6">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="font-semibold text-navy">FAQ</p>
            <p className="text-sm text-medium-gray">Edit the FAQ shown under Hire Us packages.</p>
          </div>
          <Button variant="outline" onClick={addFaq} disabled={faq.length >= 10}>
            Add FAQ
          </Button>
        </div>

        <div className="space-y-4">
          {faq.map((item, index) => (
            <div key={`faq-${index}`} className="rounded-lg border border-border-gray p-4">
              <div className="space-y-1.5">
                <Label>Question</Label>
                <Input
                  value={item.q}
                  onChange={(e) => updateFaqQuestion(index, e.target.value)}
                  maxLength={160}
                  placeholder="Enter FAQ question"
                />
              </div>
              <div className="mt-3 space-y-1.5">
                <Label>Answer</Label>
                <textarea
                  value={item.a}
                  onChange={(e) => updateFaqAnswer(index, e.target.value)}
                  rows={4}
                  maxLength={600}
                  className="w-full rounded-lg border border-border-gray px-3 py-2 text-sm"
                  placeholder="Enter FAQ answer"
                />
              </div>
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => removeFaq(index)}
                  className="text-xs text-medium-gray transition-colors hover:text-error"
                  disabled={faq.length <= 1}
                >
                  Remove FAQ
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between gap-3 rounded-lg border border-border-gray bg-slate-50 px-4 py-3">
          <p className="text-xs text-medium-gray">
            Save after editing FAQs to apply changes on Hire Us package cards.
          </p>
          <Button className="bg-navy hover:bg-blue" onClick={saveConfig} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Hire Us Pricing"}
          </Button>
        </div>
      </div>
    </div>
  );
}
