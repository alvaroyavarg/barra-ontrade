import { useCallback, useEffect, useRef, useState } from "react";
import { isSupabaseEnabled } from "../lib/supabase.js";
import {
  fetchLocals,
  upsertLocals,
  updatePillar,
  updateMissionStatus,
  updateLocalHealthScore,
} from "../services/localsService.js";

function calcHealthScore(pillars, hasAacc = false) {
  const scoreMap = { "Fuerte": 100, "Completo": 100, "Bueno": 80, "En curso": 75,
    "Completado": 90, "Atencion": 55, "Oportunidad": 55, "No aplica": 70, "Pendiente": 30, "Sin registro": 30 };
  const keys = ["staff", "assortment", "menu", "branding", "activation"];
  let total = 0;
  for (const k of keys) total += scoreMap[pillars[k]?.score ?? "Pendiente"] ?? 40;
  const base = Math.round(total / keys.length);
  return hasAacc ? Math.min(100, base + 5) : base;
}
import { addNote, fetchNotesByLocal } from "../services/notesService.js";
import {
  saveAssortmentAudit as persistAudit,
  fetchLatestAudit,
} from "../services/assortmentService.js";
import {
  fetchKanbanCards,
  upsertKanbanCards,
  moveKanbanCard,
} from "../services/kanbanService.js";

export function useSupabaseData({ fallbackLocals, fallbackWalkers, fallbackMeta }) {
  const [locals, setLocals] = useState(fallbackLocals);
  const [walkers, setWalkers] = useState(fallbackWalkers);
  const [meta, setMeta] = useState(fallbackMeta);
  const [kanbanColumns, setKanbanColumns] = useState(null);
  const [extraNotes, setExtraNotes] = useState({});
  const [loading, setLoading] = useState(false);
  const [syncError, setSyncError] = useState(null);

  const loadedRef = useRef(false);

  // Initial load from Supabase
  useEffect(() => {
    if (!isSupabaseEnabled || loadedRef.current) return;
    loadedRef.current = true;
    setLoading(true);
    Promise.all([fetchLocals(), fetchKanbanCards()])
      .then(([remoteLocals, cards]) => {
        setLocals(remoteLocals);
        if (remoteLocals.length > 0) {
          const walkerMap = new Map();
          for (const l of remoteLocals) {
            if (!l.walkerName) continue;
            if (!walkerMap.has(l.walkerName)) {
              walkerMap.set(l.walkerName, { id: l.walkerName, name: l.walkerName, count: 0 });
            }
            walkerMap.get(l.walkerName).count++;
          }
          setWalkers([...walkerMap.values()]);
          setMeta((prev) => ({ fileName: prev?.fileName, count: remoteLocals.length, walkerCount: walkerMap.size }));
        } else {
          setWalkers([]);
          setMeta(null);
        }
        if (cards.length > 0) {
          const byColumn = { todo: [], progress: [], done: [] };
          for (const card of cards) {
            const col = card.columnId ?? "todo";
            if (byColumn[col]) byColumn[col].push(card);
          }
          setKanbanColumns([
            { id: "todo",     title: "Pendiente",   cards: byColumn.todo },
            { id: "progress", title: "En progreso", cards: byColumn.progress },
            { id: "done",     title: "Completado",  cards: byColumn.done },
          ]);
        }
      })
      .catch((err) => {
        console.error("[Supabase] Error al cargar datos:", err.message);
        setSyncError(err.message);
      })
      .finally(() => setLoading(false));
  }, []);

  // Load notes lazily when a local is selected
  const loadNotesForLocal = useCallback(async (localId) => {
    if (!isSupabaseEnabled) return;
    if (extraNotes[localId] !== undefined) return; // already loaded
    try {
      const notes = await fetchNotesByLocal(localId);
      setExtraNotes((prev) => ({ ...prev, [localId]: notes }));
    } catch (err) {
      console.error("[Supabase] Error al cargar notas:", err.message);
    }
  }, [extraNotes]);

  // Publish note: update local state + persist
  const publishNote = useCallback(async (localId, note) => {
    setExtraNotes((prev) => ({
      ...prev,
      [localId]: [note, ...(prev[localId] ?? [])],
    }));
    if (!isSupabaseEnabled) return;
    try {
      await addNote(localId, note);
    } catch (err) {
      console.error("[Supabase] Error al guardar nota:", err.message);
      setSyncError(err.message);
    }
  }, []);

  // Update pillar in local state + persist + recalculate healthScore
  const updateLocalPillar = useCallback(async (localId, pillarKey, pillarData) => {
    let newHealthScore;
    setLocals((current) =>
      current.map((local) => {
        if (local.id !== localId) return local;
        const updatedPillars = {
          ...local.pillars,
          [pillarKey]: { ...(local.pillars?.[pillarKey] ?? {}), ...pillarData },
        };
        newHealthScore = calcHealthScore(updatedPillars, local.hasAacc);
        return { ...local, pillars: updatedPillars, healthScore: newHealthScore };
      })
    );
    if (!isSupabaseEnabled) return;
    try {
      await updatePillar(localId, pillarKey, pillarData);
      if (newHealthScore !== undefined) {
        await updateLocalHealthScore(localId, newHealthScore);
      }
    } catch (err) {
      console.error("[Supabase] Error al actualizar pilar:", err.message);
      setSyncError(err.message);
    }
  }, []);

  // Save assortment audit
  const saveAssortmentAudit = useCallback(
    async (localId, checkedIds, author, segmentIds) => {
      const ts = new Intl.DateTimeFormat("es-CL", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      }).format(new Date());
      const total = segmentIds.length;
      const present = checkedIds.filter((id) => segmentIds.includes(id)).length;
      const pct = total > 0 ? Math.round((present / total) * 100) : 0;
      const score =
        total === 0 ? "Sin registro"
        : present === total ? "Completado"
        : present > 0 ? "Pendiente"
        : "Sin registro";

      await updateLocalPillar(localId, "assortment", {
        score,
        summary: total > 0
          ? `${present}/${total} etiquetas · ${pct}% cumplimiento`
          : "Sin portafolio configurado",
        nextAction: present < total
          ? `Recuperar ${total - present} etiqueta${total - present > 1 ? "s" : ""}`
          : "Defender foto de éxito",
        lastAudit: ts,
      });

      if (!isSupabaseEnabled) return { checkedIds, savedAt: ts, author, present, total, pct };
      try {
        await persistAudit(localId, { checkedIds, savedAt: ts, author, present, total, pct });
      } catch (err) {
        console.error("[Supabase] Error al guardar auditoría:", err.message);
      }
      return { checkedIds, savedAt: ts, author, present, total, pct };
    },
    [updateLocalPillar]
  );

  // Update mission status
  const updateMission = useCallback(async (missionId, status, progress) => {
    setLocals((current) =>
      current.map((local) => ({
        ...local,
        missions: (local.missions ?? []).map((m) =>
          m.id === missionId ? { ...m, status, progress } : m
        ),
      }))
    );
    if (!isSupabaseEnabled) return;
    try {
      await updateMissionStatus(missionId, status, progress);
    } catch (err) {
      console.error("[Supabase] Error al actualizar misión:", err.message);
    }
  }, []);

  // Bulk upsert after Excel upload
  const importLocalsFromExcel = useCallback(async (result) => {
    setLocals(result.locals);
    setWalkers(result.walkers);
    setMeta({ fileName: result.fileName, count: result.locals.length, walkerCount: result.walkers.length });
    if (!isSupabaseEnabled) return;
    await upsertLocals(result.locals); // throws on error so caller can handle
  }, []);

  // Move kanban card
  const moveKanbanCardFn = useCallback(async (cardId, targetColumnId) => {
    setKanbanColumns((current) => {
      if (!current) return current;
      let movedCard = null;
      const withoutCard = current.map((col) => ({
        ...col,
        cards: col.cards.filter((c) => {
          if (c.id === cardId) { movedCard = c; return false; }
          return true;
        }),
      }));
      if (!movedCard) return current;
      return withoutCard.map((col) =>
        col.id === targetColumnId ? { ...col, cards: [...col.cards, movedCard] } : col
      );
    });
    if (!isSupabaseEnabled) return;
    try {
      await moveKanbanCard(cardId, targetColumnId);
    } catch (err) {
      console.error("[Supabase] Error al mover tarjeta:", err.message);
    }
  }, []);

  const addManualLocal = useCallback((newLocal) => {
    setLocals((prev) => [newLocal, ...prev]);
    if (!isSupabaseEnabled) return;
    upsertLocals([newLocal]).catch((err) =>
      console.error("[Supabase] Error al guardar cuenta manual:", err.message)
    );
  }, []);

  return {
    locals,
    setLocals,
    walkers,
    setWalkers,
    meta,
    setMeta,
    kanbanColumns,
    setKanbanColumns,
    extraNotes,
    loading,
    syncError,
    isSupabaseEnabled,
    loadNotesForLocal,
    publishNote,
    updateLocalPillar,
    saveAssortmentAudit,
    updateMission,
    importLocalsFromExcel,
    moveKanbanCardFn,
    addManualLocal,
  };
}
