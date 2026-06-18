import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { SoloScoreboardPage } from "./pages/SoloScoreboardPage";
import "./index.css";

const isSolo = window.location.hash.includes("marcador-solo");

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    {isSolo ? <SoloScoreboardPage /> : <App />}
  </React.StrictMode>
);
