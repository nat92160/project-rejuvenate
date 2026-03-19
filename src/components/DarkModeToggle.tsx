import { useState, useEffect } from "react";

const DarkModeToggle = () => {
  const [isDark, setIsDark] = useState(() => {
    try {
      return localStorage.getItem("calj_theme") === "dark";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    try { localStorage.setItem("calj_theme", isDark ? "dark" : "light"); } catch {}
  }, [isDark]);

  return (
    <button
      onClick={() => setIsDark(!isDark)}
      className="px-3 py-2 rounded-full text-sm cursor-pointer transition-all bg-card border border-border hover:border-primary/20 active:scale-95"
      style={{ boxShadow: "var(--shadow-soft)" }}
      title={isDark ? "Mode clair" : "Mode sombre"}
    >
      {isDark ? "☀️" : "🌙"}
    </button>
  );
};

export default DarkModeToggle;
