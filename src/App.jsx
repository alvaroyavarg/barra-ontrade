import React, { useState } from "react";
import OnTradeCrm from "./components/OnTradeCrm.jsx";
import CommercialConsultationModule from "./components/CommercialConsultationModule.jsx";
import AaccProfitabilityPage from "./components/AaccProfitabilityPage.jsx";
import ExecutionHub from "./components/ExecutionHub.jsx";
import { MAESTRO_LOCALS } from "./data/maestroCuentas.js";
import { useAuth } from "./contexts/AuthContext.jsx";
import LoginScreen from "./components/LoginScreen.jsx";

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err, info) { console.error("[ErrorBoundary]", err, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-900 p-6 text-center">
          <h1 className="text-[18px] font-bold text-white">Algo salió mal</h1>
          <p className="max-w-sm text-[14px] text-slate-400">Ocurrió un error inesperado. Recarga la página para continuar.</p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg bg-white px-5 py-2.5 text-[14px] font-semibold text-slate-900 transition hover:bg-slate-100"
          >Recargar</button>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  const { user, profile, loading } = useAuth();
  const [activeModule, setActiveModule] = useState("home");

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
          <span className="text-[13px] text-slate-400">Cargando…</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  if (activeModule === "commercial") {
    return (
      <main className="app-shell">
        <CommercialConsultationModule onBackHome={() => setActiveModule("home")} />
      </main>
    );
  }

  if (activeModule === "aacc") {
    return (
      <main className="app-shell app-shell--wide">
        <AaccProfitabilityPage locals={MAESTRO_LOCALS} onBackHome={() => setActiveModule("home")} />
      </main>
    );
  }

  if (activeModule === "execution") {
    return (
      <main className="app-shell app-shell--wide">
        <ExecutionHub onBackHome={() => setActiveModule("home")} />
      </main>
    );
  }

  return <OnTradeCrm onOpenModule={setActiveModule} profile={profile} />;
}

export default function AppWithBoundary() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
