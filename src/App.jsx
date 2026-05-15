import { useEffect, useState } from "react";
import OnTradeCrm from "./components/OnTradeCrm.jsx";
import CommercialConsultationModule from "./components/CommercialConsultationModule.jsx";
import AaccProfitabilityPage from "./components/AaccProfitabilityPage.jsx";
import ExecutionHub from "./components/ExecutionHub.jsx";
import LoginScreen from "./components/LoginScreen.jsx";
import { MAESTRO_LOCALS } from "./data/maestroCuentas.js";
import { getSession, fetchUserProfile, onAuthStateChange } from "./lib/auth.js";
import { isSupabaseEnabled } from "./lib/supabase.js";

function App() {
  const [activeModule, setActiveModule]   = useState("home");
  const [session, setSession]             = useState(undefined); // undefined = cargando
  const [userProfile, setUserProfile]     = useState(null);

  useEffect(() => {
    // Carga sesión inicial
    getSession().then(async (s) => {
      setSession(s);
      if (s?.user) {
        const profile = await fetchUserProfile(s.user.id);
        setUserProfile(profile);
      }
    });

    // Escucha cambios de auth (login / logout)
    const unsubscribe = onAuthStateChange(async (s) => {
      setSession(s);
      if (s?.user) {
        const profile = await fetchUserProfile(s.user.id);
        setUserProfile(profile);
      } else {
        setUserProfile(null);
      }
    });

    return unsubscribe;
  }, []);

  // Mientras verifica la sesión, muestra pantalla en blanco
  if (session === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="text-[13px] text-slate-500">Cargando…</div>
      </div>
    );
  }

  // Sin sesión activa → login (solo si Supabase está habilitado)
  if (isSupabaseEnabled && !session) {
    return <LoginScreen onLogin={(user) => setSession({ user })} />;
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

  return (
    <OnTradeCrm
      onOpenModule={setActiveModule}
      authUser={session?.user ?? null}
      userProfile={userProfile}
    />
  );
}

export default App;
