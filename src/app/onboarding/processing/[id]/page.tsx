"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";

type ProgressStep = {
  key: string;
  label: string;
  sublabel: string;
};

const STEPS: ProgressStep[] = [
  { key: "started",       label: "Starting curation",        sublabel: "Preparing your request..." },
  { key: "fetching_sites",label: "Finding relevant sites",   sublabel: "Scanning our database of 10,000+ websites..." },
  { key: "calling_ai",    label: "Running AI matching",      sublabel: "Analysing relevance with AI..." },
  { key: "saving_results",label: "Saving your results",      sublabel: "Organising sites into sections..." },
  { key: "complete",      label: "All done!",                sublabel: "Your distribution plan is ready." },
];

const EVENT_ORDER = ["started", "fetching_sites", "calling_ai", "saving_results", "complete"];

export default function OnboardingProcessingPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [currentEvent, setCurrentEvent] = useState<string>("started");
  const [failed, setFailed] = useState(false);
  const [done, setDone] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!id) return;

    const es = new EventSource(`/api/curations/${id}/stream`);
    esRef.current = es;

    es.onmessage = (e) => {
      try {
        const { event } = JSON.parse(e.data);
        if (event === "error") {
          setFailed(true);
          es.close();
          return;
        }
        if (EVENT_ORDER.includes(event)) {
          setCurrentEvent(event);
        }
        if (event === "complete") {
          setDone(true);
          es.close();
          setTimeout(() => router.push("/dashboard"), 1800);
        }
      } catch {
        // ignore parse errors
      }
    };

    es.onerror = () => {
      // fallback: poll DB via the same stream (it checks DB status too)
      // EventSource will auto-reconnect; just let it
    };

    return () => {
      es.close();
    };
  }, [id, router]);

  const currentIndex = EVENT_ORDER.indexOf(currentEvent);

  if (failed) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div
          className="bg-white rounded-[2rem] p-10 max-w-md w-full text-center"
          style={{ boxShadow: "0 8px 40px rgba(91,88,246,0.08)", border: "1px solid rgba(226,232,240,0.8)" }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{ backgroundColor: "rgba(192,57,43,0.1)" }}
          >
            <svg className="w-7 h-7" style={{ color: "var(--error)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2
            className="text-xl font-bold mb-2"
            style={{ fontFamily: "var(--font-heading)", color: "var(--dark)" }}
          >
            Curation failed
          </h2>
          <p className="text-slate-500 text-sm font-light mb-6">
            Something went wrong. Your credit has been refunded. Please try again.
          </p>
          <button
            onClick={() => router.push("/onboarding/curation")}
            style={{
              display: "inline-block", borderRadius: "999px",
              padding: "11px 28px", background: "#5B58F6", color: "#fff",
              fontWeight: 600, fontSize: "0.875rem", border: "none", cursor: "pointer",
              boxShadow: "0 0 20px rgba(91,88,246,0.3)",
            }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      {/* Step indicator */}
      <div className="w-full max-w-lg">
        <div className="flex items-center justify-center gap-2 mb-14">
          {["Plan", "Details", "Processing"].map((step, i) => (
            <div key={step} className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold"
                  style={
                    i === 2
                      ? { backgroundColor: "var(--indigo)", color: "#fff" }
                      : { backgroundColor: "rgba(91,88,246,0.2)", color: "var(--indigo)" }
                  }
                >
                  {i < 2 ? (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </div>
                <span
                  className="text-sm font-medium"
                  style={{ color: i === 2 ? "var(--dark)" : "var(--indigo)" }}
                >
                  {step}
                </span>
              </div>
              {i < 2 && <div className="w-8 h-px" style={{ backgroundColor: "#e2e8f0" }} />}
            </div>
          ))}
        </div>

        <div
          className="bg-white rounded-[2rem] p-8 sm:p-10"
          style={{
            boxShadow: "0 8px 40px rgba(91,88,246,0.08)",
            border: "1px solid rgba(226,232,240,0.8)",
          }}
        >
          {/* Animated icon */}
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div
                className="w-20 h-20 rounded-3xl flex items-center justify-center"
                style={{ backgroundColor: "rgba(91,88,246,0.1)" }}
              >
                {done ? (
                  <svg className="w-9 h-9" style={{ color: "var(--success)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg
                    className="w-9 h-9"
                    style={{ color: "var(--indigo)", animation: "spin 2s linear infinite" }}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                )}
              </div>
              {/* Pulse ring */}
              {!done && (
                <div
                  className="absolute inset-0 rounded-3xl"
                  style={{
                    border: "2px solid rgba(91,88,246,0.3)",
                    animation: "ping 2s cubic-bezier(0,0,0.2,1) infinite",
                  }}
                />
              )}
            </div>
          </div>

          <div className="text-center mb-8">
            <h2
              className="text-2xl font-bold mb-2"
              style={{ fontFamily: "var(--font-heading)", color: "var(--dark)" }}
            >
              {done ? "Ready to explore!" : "Building your distribution plan"}
            </h2>
            <p className="text-slate-500 text-sm font-light">
              {done
                ? "Redirecting you to your dashboard..."
                : "This usually takes 10–30 seconds. Don't close this tab."}
            </p>
          </div>

          {/* Steps */}
          <div className="space-y-3">
            {STEPS.map((step, i) => {
              const stepIndex = EVENT_ORDER.indexOf(step.key);
              const isComplete = stepIndex < currentIndex || (done && step.key === "complete");
              const isActive = step.key === currentEvent && !done;
              const isPending = stepIndex > currentIndex && !(done && step.key === "complete");

              return (
                <div
                  key={step.key}
                  className="flex items-center gap-3 p-3 rounded-2xl transition-all duration-500"
                  style={{
                    backgroundColor: isActive
                      ? "rgba(91,88,246,0.06)"
                      : isComplete
                      ? "rgba(39,174,96,0.04)"
                      : "transparent",
                    border: isActive
                      ? "1px solid rgba(91,88,246,0.12)"
                      : isComplete
                      ? "1px solid rgba(39,174,96,0.1)"
                      : "1px solid transparent",
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300"
                    style={{
                      backgroundColor: isComplete
                        ? "rgba(39,174,96,0.12)"
                        : isActive
                        ? "rgba(91,88,246,0.15)"
                        : "rgba(226,232,240,0.6)",
                    }}
                  >
                    {isComplete ? (
                      <svg className="w-4 h-4" style={{ color: "var(--success)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : isActive ? (
                      <div
                        className="w-3.5 h-3.5 rounded-full border-2 border-t-transparent"
                        style={{
                          borderColor: "var(--indigo)",
                          borderTopColor: "transparent",
                          animation: "spin 0.8s linear infinite",
                        }}
                      />
                    ) : (
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: isPending ? "#cbd5e1" : "#94a3b8" }} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-medium leading-tight"
                      style={{
                        color: isComplete
                          ? "var(--success)"
                          : isActive
                          ? "var(--indigo)"
                          : "#94a3b8",
                      }}
                    >
                      {step.label}
                    </p>
                    {isActive && (
                      <p className="text-xs text-slate-400 font-light mt-0.5">{step.sublabel}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes ping {
          75%, 100% { transform: scale(1.4); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
