import { supabase } from "../lib/supabase.js";

const BUCKET = "evidencias";

/**
 * Redimensiona y comprime una imagen en el browser antes de subir.
 * @param {File} file  - Archivo original
 * @param {number} maxWidth - Ancho máximo en px (default 1200)
 * @param {number} quality  - Calidad JPEG 0–1 (default 0.75)
 * @returns {Promise<File>} Archivo comprimido
 */
export function compressImage(file, maxWidth = 1200, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const blobUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(blobUrl);
      const scale = Math.min(1, maxWidth / img.width);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error("Error al comprimir imagen")); return; }
          resolve(new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" }));
        },
        "image/jpeg",
        quality,
      );
    };
    img.onerror = () => { URL.revokeObjectURL(blobUrl); reject(new Error("Error al leer imagen")); };
    img.src = blobUrl;
  });
}

/**
 * Comprime y sube una foto al bucket "evidencias".
 * Ruta: evidencias/{localId}/{moduleKey}/{timestamp}.jpg
 * @returns {Promise<string>} URL pública de la foto subida
 */
export async function uploadPhoto(localId, moduleKey, file) {
  if (!supabase) throw new Error("Storage no disponible — configura VITE_SUPABASE_URL");

  const compressed = await compressImage(file);
  const path = `${localId}/${moduleKey}/${Date.now()}.jpg`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, compressed, { contentType: "image/jpeg", upsert: false });

  if (uploadError) throw new Error(`Error al subir foto: ${uploadError.message}`);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
