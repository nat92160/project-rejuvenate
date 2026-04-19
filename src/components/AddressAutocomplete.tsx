import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { MapPin, Loader2 } from "lucide-react";

interface Prediction {
  place_id: string;
  description: string;
  main_text: string;
  secondary_text: string;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (data: { street: string; city: string; postal_code: string; country: string }) => void;
  placeholder?: string;
  required?: boolean;
}

export const AddressAutocomplete = ({
  value,
  onChange,
  onSelect,
  placeholder = "Commencez à taper votre adresse…",
  required,
}: AddressAutocompleteProps) => {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [skipNext, setSkipNext] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    if (skipNext) {
      setSkipNext(false);
      return;
    }
    if (!value || value.trim().length < 3) {
      setPredictions([]);
      setOpen(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        const r = await fetch(
          `https://${projectId}.supabase.co/functions/v1/places-autocomplete?q=${encodeURIComponent(value)}`
        );
        const d = await r.json();
        setPredictions(d.predictions || []);
        setOpen((d.predictions || []).length > 0);
      } catch (e) {
        setPredictions([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value]);

  const handleSelect = async (p: Prediction) => {
    setOpen(false);
    setLoading(true);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const r = await fetch(
        `https://${projectId}.supabase.co/functions/v1/places-autocomplete?place_id=${encodeURIComponent(p.place_id)}`
      );
      const d = await r.json();
      if (d.street) {
        setSkipNext(true);
        onChange(d.street);
        onSelect({
          street: d.street || "",
          city: d.city || "",
          postal_code: d.postal_code || "",
          country: d.country || "",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => predictions.length > 0 && setOpen(true)}
        required={required}
        autoComplete="off"
      />
      {loading && (
        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
      )}
      {open && predictions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 rounded-xl border border-border bg-card shadow-lg z-50 overflow-hidden max-h-72 overflow-y-auto">
          {predictions.map((p) => (
            <button
              key={p.place_id}
              type="button"
              onClick={() => handleSelect(p)}
              className="w-full text-left px-3 py-2.5 hover:bg-muted transition-colors flex items-start gap-2 border-b border-border last:border-b-0"
            >
              <MapPin className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-foreground truncate">{p.main_text}</div>
                {p.secondary_text && (
                  <div className="text-[11px] text-muted-foreground truncate">{p.secondary_text}</div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
