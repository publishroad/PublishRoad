import { useEffect, useRef, useState } from "react";

interface StreamingCurationData {
  id: string;
  productUrl: string;
  status: "pending" | "processing" | "completed" | "failed";
  keywords: string[];
  description: string | null;
  results: StreamingResult[];
  maskedCount: number;
}

interface StreamingResult {
  id: string;
  websiteId: string;
  matchScore: number;
  matchReason: string | null;
  section: "a" | "b" | "c";
  rank: number;
  userStatus: "saved" | "hidden" | null;
  masked?: boolean;
  website?: { name: string; url: string; da: number; type: string };
}

interface UseStreamingCurationReturn {
  data: StreamingCurationData | null;
  isLoading: boolean;
  error: Error | null;
  isStreaming: boolean;
}

/**
 * Hook for real-time curation data via Server-Sent Events (SSE).
 * Replaces aggressive polling with persistent streaming connection.
 * 
 * Handles:
 * - Initial data fetch
 * - Real-time status updates via SSE
 * - Automatic reconnection on connection loss
 * - Proper cleanup on unmount
 * - No duplicate connections
 */
export function useStreamingCuration(
  curationId: string
): UseStreamingCurationReturn {
  const [data, setData] = useState<StreamingCurationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);

  // Track the EventSource connection to prevent duplicates
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isUnmountingRef = useRef(false);
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 5; // Prevent infinite reconnection loops

  useEffect(() => {
    // Reset unmounting flag
    isUnmountingRef.current = false;

    // Step 1: Fetch initial curation data
    const fetchInitialData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const res = await fetch(`/api/curations/${curationId}`);
        if (!res.ok) throw new Error("Failed to fetch curation");
        const initialData = (await res.json()) as StreamingCurationData;
        setData(initialData);

        // Only open stream if curation is still processing
        if (
          initialData.status === "processing" ||
          initialData.status === "pending"
        ) {
          openStream(initialData);
        }

        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Unknown error"));
        setIsLoading(false);
      }
    };

    // Step 2: Open EventSource stream for real-time updates
    const openStream = (initialData: StreamingCurationData) => {
      // Prevent duplicate connections
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      if (isUnmountingRef.current) return;

      setIsStreaming(true);
      retryCountRef.current = 0; // Reset retry counter on successful connection attempt
      const eventSource = new EventSource(`/api/curations/${curationId}/stream`);
      eventSourceRef.current = eventSource;

      eventSource.addEventListener("message", (event) => {
        try {
          const message = JSON.parse(event.data);

          // Handle different event types from the stream
          if (message.event === "complete") {
            // Curation processing completed - fetch final data and close stream
            fetchFinalData();
            closeStream();
          } else if (message.event === "error") {
            // Curation processing failed
            setData((prev) =>
              prev ? { ...prev, status: "failed" } : null
            );
            closeStream();
          } else if (message.progress) {
            // Update progress if included in message
            setData((prev) =>
              prev ? { ...prev, ...message.progress } : null
            );
          }
        } catch (err) {
          console.error("Error parsing stream message:", err);
        }
      });

      eventSource.addEventListener("error", () => {
        console.error("Stream connection error");
        closeStream();
        // Attempt to reconnect after 2 seconds
        scheduleReconnect();
      });
    };

    // Step 3: Fetch final data when curation completes
    const fetchFinalData = async () => {
      try {
        const res = await fetch(`/api/curations/${curationId}`);
        if (!res.ok) throw new Error("Failed to fetch final curation data");
        const finalData = (await res.json()) as StreamingCurationData;
        setData(finalData);
      } catch (err) {
        console.error("Error fetching final data:", err);
      }
    };

    // Step 4: Close the EventSource connection
    const closeStream = () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setIsStreaming(false);
    };

    // Step 5: Schedule reconnection attempt (fixed 2-second retry)
    const scheduleReconnect = () => {
      if (isUnmountingRef.current) return;

      // Give up after MAX_RETRIES attempts to prevent infinite loops
      retryCountRef.current += 1;
      if (retryCountRef.current > MAX_RETRIES) {
        console.error("Max reconnection retries exceeded");
        setError(new Error("Connection lost after multiple retry attempts"));
        return;
      }

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      // Fixed 2-second delay between retry attempts
      reconnectTimeoutRef.current = setTimeout(() => {
        if (isUnmountingRef.current) return;
        if (data && (data.status === "processing" || data.status === "pending")) {
          openStream(data);
        }
      }, 2000);
    };

    // Start the data fetching
    fetchInitialData();

    // Cleanup on unmount
    return () => {
      isUnmountingRef.current = true;

      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      setIsStreaming(false);
    };
  }, [curationId]);

  return { data, isLoading, error, isStreaming };
}
