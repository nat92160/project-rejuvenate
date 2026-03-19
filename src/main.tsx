import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Force light mode by default
document.documentElement.classList.remove("dark");
if (!localStorage.getItem("calj_theme")) {
  localStorage.setItem("calj_theme", "light");
}
if (localStorage.getItem("calj_theme") === "light") {
  document.documentElement.classList.remove("dark");
}

createRoot(document.getElementById("root")!).render(<App />);
