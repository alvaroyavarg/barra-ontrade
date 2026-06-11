import { Activity } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";

export default function ActividadPage() {
  return (
    <>
      <PageHeader title="Actividad" subtitle="Historial de visitas en terreno" />
      <EmptyState
        icon={Activity}
        title="Todavía no hay visitas"
        body="Cuando se registren visitas en terreno, acá vas a ver el historial completo: score por pilar, alertas AACC y fotos."
        hint="Se construye en la Fase 2"
      />
    </>
  );
}
