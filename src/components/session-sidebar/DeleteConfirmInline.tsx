import { Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type DeleteConfirmInlineProps = {
  onConfirm: (e: React.MouseEvent) => void;
  onCancel: (e: React.MouseEvent) => void;
  confirmAriaLabel?: string;
  cancelAriaLabel?: string;
};

export function DeleteConfirmInline({
  onConfirm,
  onCancel,
  confirmAriaLabel = "Confirm delete",
  cancelAriaLabel = "Cancel delete",
}: DeleteConfirmInlineProps) {
  return (
    <div className="flex items-center gap-0.5 h-7 shrink-0">
      <Button
        variant="destructive"
        size="icon-xs"
        className="h-7 w-7"
        onClick={onConfirm}
        aria-label={confirmAriaLabel}
      >
        <Trash2 className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon-xs"
        className="h-7 w-7"
        onClick={onCancel}
        aria-label={cancelAriaLabel}
      >
        <X className="size-4" />
      </Button>
    </div>
  );
}
