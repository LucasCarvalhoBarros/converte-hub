import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./lib/amplify";
import { auth } from "./lib/auth";

auth.bootstrap().finally(() => {
  createRoot(document.getElementById("root")!).render(<App />);
});
