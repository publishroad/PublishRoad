"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  PRICING_COMPARISON_MAX_ROWS,
  PricingComparisonRow,
  valueToEditorText,
} from "@/lib/pricing-comparison";

type EditableRow = {
  feature: string;
  values: [string, string, string, string];
};

function toEditableRows(rows: PricingComparisonRow[]): EditableRow[] {
  return rows.map((row) => ({
    feature: row.feature,
    values: [
      valueToEditorText(row.values[0]),
      valueToEditorText(row.values[1]),
      valueToEditorText(row.values[2]),
      valueToEditorText(row.values[3]),
    ],
  }));
}

function emptyRow(): EditableRow {
  return { feature: "", values: ["", "", "", ""] };
}

export function PricingComparisonEditor({ initialRows }: { initialRows: PricingComparisonRow[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<EditableRow[]>(toEditableRows(initialRows));
  const [isSaving, setIsSaving] = useState(false);

  function updateFeature(index: number, value: string) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, feature: value } : row)));
  }

  function updateValue(index: number, col: 0 | 1 | 2 | 3, value: string) {
    setRows((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;
        const nextValues: [string, string, string, string] = [...row.values] as [string, string, string, string];
        nextValues[col] = value;
        return { ...row, values: nextValues };
      })
    );
  }

  function addRow() {
    setRows((prev) => (prev.length >= PRICING_COMPARISON_MAX_ROWS ? prev : [...prev, emptyRow()]));
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  async function saveRows() {
    setIsSaving(true);

    const payloadRows = rows.map((row) => ({
      feature: row.feature,
      values: row.values,
    }));

    const res = await fetch("/api/admin/pricing/comparison", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows: payloadRows }),
    });

    setIsSaving(false);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error ?? "Failed to save comparison table");
      return;
    }

    const data = await res.json().catch(() => null) as { rows?: PricingComparisonRow[] } | null;
    if (data?.rows) {
      setRows(toEditableRows(data.rows));
    }

    toast.success("Comparison table updated");
    router.refresh();
  }

  return (
    <div className="mt-8 rounded-xl border border-border-gray bg-white p-6">
      <div className="mb-4">
        <p className="font-semibold text-navy">Compare Plans Table</p>
        <p className="mt-1 text-sm text-medium-gray">
          Edit rows shown in the public pricing &quot;Compare plans&quot; section. Use yes/no for check marks.
        </p>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-5 gap-2 text-xs font-semibold uppercase tracking-wide text-medium-gray">
          <div>Feature</div>
          <div>Free</div>
          <div>Starter</div>
          <div>Pro</div>
          <div>Lifetime</div>
        </div>

        {rows.map((row, index) => (
          <div key={`row-${index}`} className="space-y-2 rounded-lg border border-border-gray p-3">
            <div className="grid grid-cols-5 gap-2">
              <Input
                value={row.feature}
                onChange={(e) => updateFeature(index, e.target.value)}
                placeholder="Feature name"
              />
              <Input
                value={row.values[0]}
                onChange={(e) => updateValue(index, 0, e.target.value)}
                placeholder="Free"
              />
              <Input
                value={row.values[1]}
                onChange={(e) => updateValue(index, 1, e.target.value)}
                placeholder="Starter"
              />
              <Input
                value={row.values[2]}
                onChange={(e) => updateValue(index, 2, e.target.value)}
                placeholder="Pro"
              />
              <Input
                value={row.values[3]}
                onChange={(e) => updateValue(index, 3, e.target.value)}
                placeholder="Lifetime"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => removeRow(index)}
                className="text-xs text-medium-gray transition-colors hover:text-error"
              >
                Remove row
              </button>
            </div>
          </div>
        ))}

        <div className="flex items-center justify-between">
          <p className="text-xs text-medium-gray">
            Rows: {rows.length}/{PRICING_COMPARISON_MAX_ROWS}
          </p>
          <Button variant="outline" onClick={addRow} disabled={rows.length >= PRICING_COMPARISON_MAX_ROWS}>
            Add Row
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button className="bg-navy hover:bg-blue" onClick={saveRows} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Compare Table"}
          </Button>
          <Label className="text-xs text-medium-gray">Tip: yes/no, true/false, or check/x will auto-convert to checkmarks.</Label>
        </div>
      </div>
    </div>
  );
}
