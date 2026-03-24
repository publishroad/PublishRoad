"use client";

import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";

interface ProgressTrackerProps {
  curationId: string;
  onComplete: () => void;
}

type ProgressEvent =
  | "started"
  | "fetching_sites"
  | "calling_ai"
  | "saving_results"
  | "complete"
  | "error";

const progressMap: Record<ProgressEvent, number> = {
  started: 5,
  fetching_sites: 25,
  calling_ai: 55,
  saving_results: 85,
  complete: 100,
  error: 0,
};

const labelMap: Record<ProgressEvent, string> = {
  started: "Starting curation...",
  fetching_sites: "Finding matching sites...",
  calling_ai: "AI is analyzing your product...",
  saving_results: "Saving your results...",
  complete: "Done!",
  error: "Something went wrong.",
};

export function ProgressTracker({ curationId, onComplete }: ProgressTrackerProps) {
  const [progress, setProgress] = useState(5);
  const [label, setLabel] = useState("Starting curation...");
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    const es = new EventSource(`/api/curations/${curationId}/stream`);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as { event: ProgressEvent };
        const evt = data.event;

        setProgress(progressMap[evt] ?? 0);
        setLabel(labelMap[evt] ?? "Processing...");

        if (evt === "complete") {
          es.close();
          setTimeout(onComplete, 500);
        }

        if (evt === "error") {
          setIsError(true);
          es.close();
        }
      } catch {
        // Ignore parse errors
      }
    };

    es.onerror = () => {
      es.close();
    };

    return () => es.close();
  }, [curationId, onComplete]);

  return (
    <div className="bg-white rounded-xl border border-border-gray p-6 text-center">
      <div className="mb-4">
        {isError ? (
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto">
            <svg className="w-6 h-6 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        ) : progress === 100 ? (
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <svg className="w-6 h-6 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        ) : (
          <div className="w-12 h-12 rounded-full bg-light-blue flex items-center justify-center mx-auto animate-pulse">
            <svg className="w-6 h-6 text-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        )}
      </div>

      <p className={`font-medium mb-4 ${isError ? "text-error" : "text-navy"}`}>
        {label}
      </p>

      {!isError && (
        <div className="max-w-xs mx-auto">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-medium-gray mt-2">{progress}% complete</p>
        </div>
      )}

      {isError && (
        <p className="text-sm text-medium-gray mt-2">
          Please try again or contact support if this persists.
        </p>
      )}
    </div>
  );
}
