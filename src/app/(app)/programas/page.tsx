import { GraduationCap } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";

export default function ProgramasPage() {
  return (
    <>
      <PageHeader title="Programas" subtitle="Incentivos y capacitaciones por cliente" />
      <EmptyState
        icon={GraduationCap}
        title="Módulo de programas de staff"
        body="Acá se registran y siguen los incentivos y capacitaciones (comerciales y de marca con DBA) por cliente."
        hint="Se construye en la Fase 5"
      />
    </>
  );
}
