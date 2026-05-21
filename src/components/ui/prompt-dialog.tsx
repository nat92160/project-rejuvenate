import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type PromptRequest = {
  type: "prompt";
  title?: string;
  message: string;
  defaultValue?: string;
  placeholder?: string;
  okLabel?: string;
  cancelLabel?: string;
  resolve: (v: string | null) => void;
};

type ConfirmRequest = {
  type: "confirm";
  title?: string;
  message: string;
  okLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  resolve: (v: boolean) => void;
};

type ChoiceRequest = {
  type: "choice";
  title?: string;
  message?: string;
  options: { id: string; label: string; hint?: string; selected?: boolean }[];
  cancelLabel?: string;
  resolve: (id: string | null) => void;
};

type Request = PromptRequest | ConfirmRequest | ChoiceRequest;

let pushRequest: ((r: Request) => void) | null = null;

export function promptDialog(opts: Omit<PromptRequest, "type" | "resolve">): Promise<string | null> {
  return new Promise((resolve) => {
    if (!pushRequest) {
      // Fallback to native if host not mounted
      const v = window.prompt(opts.message, opts.defaultValue || "");
      resolve(v);
      return;
    }
    pushRequest({ type: "prompt", resolve, ...opts });
  });
}

export function confirmDialog(opts: Omit<ConfirmRequest, "type" | "resolve">): Promise<boolean> {
  return new Promise((resolve) => {
    if (!pushRequest) {
      resolve(window.confirm(opts.message));
      return;
    }
    pushRequest({ type: "confirm", resolve, ...opts });
  });
}

export function chooseDialog(opts: Omit<ChoiceRequest, "type" | "resolve">): Promise<string | null> {
  return new Promise((resolve) => {
    if (!pushRequest) {
      resolve(null);
      return;
    }
    pushRequest({ type: "choice", resolve, ...opts });
  });
}

export function PromptDialogHost() {
  const [request, setRequest] = useState<Request | null>(null);
  const [value, setValue] = useState("");

  useEffect(() => {
    pushRequest = (r) => {
      if (r.type === "prompt") setValue(r.defaultValue || "");
      setRequest(r);
    };
    return () => {
      pushRequest = null;
    };
  }, []);

  const close = () => setRequest(null);

  const handleOk = () => {
    if (!request) return;
    if (request.type === "prompt") request.resolve(value.trim() ? value : null);
    if (request.type === "confirm") request.resolve(true);
    close();
  };

  const handleCancel = () => {
    if (!request) return;
    if (request.type === "prompt") request.resolve(null);
    if (request.type === "confirm") request.resolve(false);
    if (request.type === "choice") request.resolve(null);
    close();
  };

  const handlePickChoice = (id: string) => {
    if (!request || request.type !== "choice") return;
    request.resolve(id);
    close();
  };

  return (
    <Dialog open={!!request} onOpenChange={(o) => { if (!o) handleCancel(); }}>
      <DialogContent className="sm:max-w-md">
        {request && (
          <>
            <DialogHeader>
              <DialogTitle className="font-display">
                {request.title || (request.type === "confirm" ? "Confirmation" : request.type === "choice" ? "Choisir" : "Saisir")}
              </DialogTitle>
              {(request.type !== "choice" || request.message) && (
                <DialogDescription className="whitespace-pre-line text-sm">
                  {request.type === "choice" ? request.message : request.message}
                </DialogDescription>
              )}
            </DialogHeader>

            {request.type === "prompt" && (
              <Input
                autoFocus
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={request.placeholder}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleOk();
                }}
                style={{ fontSize: 16 }}
              />
            )}

            {request.type === "choice" && (
              <div className="flex flex-col gap-2 max-h-[50vh] overflow-y-auto">
                {request.options.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => handlePickChoice(opt.id)}
                    className="w-full text-left px-4 py-3 rounded-xl border border-border hover:bg-accent transition-colors cursor-pointer"
                    style={opt.selected ? { background: "hsl(var(--gold) / 0.12)", borderColor: "hsl(var(--gold) / 0.4)" } : {}}
                  >
                    <div className="font-bold text-sm text-foreground">{opt.label}{opt.selected ? " ✓" : ""}</div>
                    {opt.hint && <div className="text-[11px] text-muted-foreground mt-0.5">{opt.hint}</div>}
                  </button>
                ))}
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-2">
              <Button variant="outline" onClick={handleCancel}>
                {request.cancelLabel || "Annuler"}
              </Button>
              {request.type !== "choice" && (
                <Button
                  onClick={handleOk}
                  variant={request.type === "confirm" && request.destructive ? "destructive" : "default"}
                  disabled={request.type === "prompt" && !value.trim()}
                >
                  {("okLabel" in request && request.okLabel) || "OK"}
                </Button>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}