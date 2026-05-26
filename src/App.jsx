import { useState } from "react";
import OnTradeCrm from "./components/OnTradeCrm.jsx";
import CommercialConsultationModule from "./components/CommercialConsultationModule.jsx";
import AaccProfitabilityPage from "./components/AaccProfitabilityPage.jsx";
import ExecutionHub from "./components/ExecutionHub.jsx";
import { MAESTRO_LOCALS } from "./data/maestroCuentas.js";
import { useAuth } from "./contexts/AuthContext.jsx";
import LoginScreen from "./components/LoginScreen.jsx";

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

export default App;
