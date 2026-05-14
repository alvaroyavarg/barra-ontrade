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

  return (
    <section className="card upload-card" aria-label="Carga de archivo">
      <div className="section-heading">
        <span className="eyebrow">Carga diaria</span>
        <h2>Excel de ventas</h2>
        {fileName ? <p className="upload-file-name">{fileName}</p> : null}
      </div>

      <button
        className={`upload-zone ${isDragging ? "upload-zone--active" : ""}`}
        disabled={isLoading}
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <span className="upload-icon" aria-hidden="true">
          ↑
        </span>
        <span className="upload-title">{isLoading ? "Procesando..." : fileName ? "Cambiar Excel" : "Subir Excel"}</span>
        <span className="upload-copy">.xlsx o .xls</span>
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
