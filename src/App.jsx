import { useState } from "react";
import OnTradeCrm from "./components/OnTradeCrm.jsx";
import CommercialConsultationModule from "./components/CommercialConsultationModule.jsx";
import AaccProfitabilityPage from "./components/AaccProfitabilityPage.jsx";
import ExecutionHub from "./components/ExecutionHub.jsx";
import { MAESTRO_LOCALS } from "./data/maestroCuentas.js";

function App() {
  const [activeModule, setActiveModule] = useState("home");

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

  return <OnTradeCrm onOpenModule={setActiveModule} />;
}

export default App;
