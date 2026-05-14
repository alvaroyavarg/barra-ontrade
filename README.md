# On Trade Copilot

MVP mobile-first para transformar un Excel de ventas de Power BI Andina en fichas comerciales por cliente.

Este MVP es el primer módulo de una plataforma comercial más amplia para el canal.

## Correr localmente

```bash
npm install
npm run dev
```

La app procesa el Excel en el navegador con `xlsx`. No requiere backend ni login.

## Módulo actual

**Consulta comercial**

- Vista General
- Vista Acuerdos Comerciales
- Vista por Cuenta
- Comparativos vs AA mes, vs mes anterior y vs AA YTD
- Selector año calendario / año fiscal Diageo
- Filtros comerciales
- Rankings de crecimiento y decrecimiento
- Fichas por cuenta con insights accionables

## Plataforma futura

Pilares definidos:

1. Consulta comercial
2. Rentabilidad AACC
3. Ejecución

Ejecución se divide en:

1. Medición de cartas con IA
2. Reportes ruta PDV

## Documentación

- Roadmap plataforma: [docs/platform-roadmap.md](docs/platform-roadmap.md)
- Snapshot MVP actual: [docs/current-mvp-snapshot.md](docs/current-mvp-snapshot.md)
- Checklist deploy: [docs/deploy-checklist.md](docs/deploy-checklist.md)
- Notas export Andina: [docs/andina-export-notes.md](docs/andina-export-notes.md)

## Export real de Andina

El archivo revisado desde Power BI trae `Año` y `Día`, pero no fecha completa ni mes. Para ese caso, la app compara el año más reciente contra el año anterior en el mismo rango de días.

Notas del mapeo y limpieza: [docs/andina-export-notes.md](docs/andina-export-notes.md)
