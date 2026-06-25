import { useRef, useState } from "react";

function UploadCard({ fileName, isLoading, onFileSelected }) {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  function handleInputChange(event) {
    onFileSelected(event.target.files?.[0]);
    event.target.value = "";
  }

  function handleDrop(event) {
    event.preventDefault();
    setIsDragging(false);
    onFileSelected(event.dataTransfer.files?.[0]);
  }

  const dropzoneTone = isDragging
    ? "border-slate-900 bg-slate-50"
    : "border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50";

  return (
    <section
      aria-label="Carga de archivo"
      className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-8 shadow-sm"
    >
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Carga diaria
        </span>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Excel de ventas</h2>
        {fileName ? (
          <p className="truncate text-sm text-slate-500">{fileName}</p>
        ) : null}
      </div>

      <button
        type="button"
        disabled={isLoading}
        onClick={() => inputRef.current?.click()}
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 ${dropzoneTone}`}
      >
        <span aria-hidden="true" className="text-3xl text-slate-400">
          ↑
        </span>
        <span className="text-base font-semibold text-slate-900">
          {isLoading ? "Procesando..." : fileName ? "Cambiar Excel" : "Subir Excel"}
        </span>
        <span className="text-sm text-slate-500">.xlsx o .xls</span>
      </button>

      <input
        ref={inputRef}
        accept=".xlsx,.xls,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="sr-only"
        disabled={isLoading}
        type="file"
        onChange={handleInputChange}
      />
    </section>
  );
}

export default UploadCard;
