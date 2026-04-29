// ─── Google Apps Script — DriveUploader ─────────────────────────────────────
// Desplegá como Web App:
//   Ejecutar como: Tú (el dueño)
//   Quién tiene acceso: Cualquier persona (o "Cualquier persona de la organización")
// La URL que te da GAS al deployar va al .env del frontend como VITE_GAS_URL

// Origen permitido — cambiá por tu dominio real en producción
const ALLOWED_ORIGIN = '*' // o 'http://192.168.1.42:5173'

function doOptions(e) {
  return ContentService.createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT)
}

/**
 * doPost recibe JSON:
 * {
 *   pdf_b64:   string,   // PDF en Base64
 *   filename:  string,   // Ej: "Liquidacion_000042.pdf"
 *   folder_id: string,   // ID de la carpeta Drive del proveedor
 * }
 *
 * Responde JSON:
 * { ok: true, file_id: "...", file_url: "..." }
 * { ok: false, error: "..." }
 */
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents)
    const { pdf_b64, filename, folder_id } = payload

    if (!pdf_b64 || !filename || !folder_id) {
      return jsonResponse({ ok: false, error: 'Faltan campos: pdf_b64, filename o folder_id.' })
    }

    // Decodificar base64
    const bytes = Utilities.base64Decode(pdf_b64)
    const blob  = Utilities.newBlob(bytes, 'application/pdf', filename)

    // Obtener carpeta y crear/reemplazar archivo
    const folder = DriveApp.getFolderById(folder_id)

    // Si ya existe un archivo con el mismo nombre, lo elimina para no duplicar
    const existentes = folder.getFilesByName(filename)
    while (existentes.hasNext()) {
      existentes.next().setTrashed(true)
    }

    const file = folder.createFile(blob)

    return jsonResponse({
      ok:       true,
      file_id:  file.getId(),
      file_url: file.getUrl(),
    })
  } catch (err) {
    return jsonResponse({ ok: false, error: err.message })
  }
}

function doGet(e) {
  return jsonResponse({ ok: true, status: 'DriveUploader activo' })
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON)
}
