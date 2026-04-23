import { Brain } from "lucide-react";
import { Card } from "@/components/ui/card";

type ConceptGraphSkeletonCardProps = {
  slotIndex: number;
};

export function ConceptGraphSkeletonCard({
  slotIndex,
}: ConceptGraphSkeletonCardProps) {
  return (
    <Card
      size="sm"
      className="relative flex h-full min-h-[200px] flex-col bg-transparent shadow-none"
      aria-label={`Loading concept slot ${slotIndex + 1}`}
    >
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <Brain
          size={18}
          className="text-muted-foreground/70"
          strokeWidth={2}
          aria-hidden="true"
        />
      </div>
    </Card>
  );
}
