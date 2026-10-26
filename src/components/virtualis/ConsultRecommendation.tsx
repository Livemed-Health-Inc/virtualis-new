import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { getConsultRecommendation } from "@/lib/consult/recommendation.functions";

export default function ConsultRecommendation({ facility }: { facility: string }) {
  const getRecommendation = useServerFn(getConsultRecommendation);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState("Model unavailable · review required. Live calls disabled.");
  const check = async () => {
    setPending(true);
    try {
      const result = await getRecommendation({ data: { facility } });
      setStatus(
        `Model unavailable · review required. ${result.status === "unavailable" ? result.reason : "Live calls disabled."}`,
      );
    } catch {
      setStatus(
        "Recommendation unavailable · facility access could not be verified. Review required.",
      );
    } finally {
      setPending(false);
    }
  };
  return (
    <section
      aria-label="Development consult recommendation"
      className="mt-4 space-y-2 border-y border-border py-3 text-foreground"
    >
      <h3 className="text-sm font-semibold">AWS Acuity · development only</h3>
      <p role="status" className="text-sm text-muted-foreground">
        {status}
      </p>
      <Button variant="outline" size="sm" onClick={check} disabled={pending}>
        {pending ? "Checking access…" : "Check recommendation access"}
      </Button>
    </section>
  );
}
