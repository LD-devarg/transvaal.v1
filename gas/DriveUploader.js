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
 *   pdf_b64:   string,          // (legacy) PDF en Base64
 *   file_b64:  string,          // Archivo en Base64 (cualquier tipo)
 *   mime_type: string,          // MIME type del archivo, ej: 'image/jpeg'
 *   filename:  string,          // Ej: "VTV-LUCAS-PALMA.pdf"
 *   replace_prefix: string,     // Opcional: pisa cualquier archivo que empiece igual, sin importar extension
 *   folder_id: string,          // ID de la carpeta Drive del proveedor
 * }
 *
 * Responde JSON:
 * { ok: true, file_id: "...", file_url: "..." }
 * { ok: false, error: "..." }
 */
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents)
    const { pdf_b64, file_b64, mime_type, filename, replace_prefix, folder_id } = payload

    const b64      = file_b64 || pdf_b64
    const mimeType = mime_type || 'application/pdf'

    if (!b64 || !filename || !folder_id) {
      return jsonResponse({ ok: false, error: 'Faltan campos: file_b64 (o pdf_b64), filename o folder_id.' })
    }

    // Decodificar base64
    const bytes = Utilities.base64Decode(b64)
    const blob  = Utilities.newBlob(bytes, mimeType, filename)

    // Obtener carpeta y crear/reemplazar archivo
    const folder = DriveApp.getFolderById(folder_id)

    // Si ya existe un archivo con el mismo nombre, lo elimina para no duplicar
    const existentes = folder.getFilesByName(filename)
    while (existentes.hasNext()) {
      existentes.next().setTrashed(true)
    }

    // Si se envia replace_prefix, tambien pisa versiones con otra extension.
    // Ej: "VTV-LUCAS-PALMA.pdf" reemplaza "VTV-LUCAS-PALMA.jpg".
    if (replace_prefix) {
      const allFiles = folder.getFiles()
      while (allFiles.hasNext()) {
        const existingFile = allFiles.next()
        const existingName = existingFile.getName()
        if (existingName === filename || existingName.indexOf(replace_prefix + '.') === 0) {
          existingFile.setTrashed(true)
        }
      }
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
  try {
    const params = e && e.parameter ? e.parameter : {}

    if (params.action === 'list') {
      const folderId = params.folder_id
      if (!folderId) {
        return jsonResponse({ ok: false, error: 'Falta folder_id.' })
      }

      const folder = DriveApp.getFolderById(folderId)
      const files = []
      const iterator = folder.getFiles()

      while (iterator.hasNext()) {
        const file = iterator.next()
        files.push({
          id: file.getId(),
          name: file.getName(),
          mime_type: file.getMimeType(),
          url: file.getUrl(),
          size: file.getSize(),
          updated_at: file.getLastUpdated().toISOString(),
          created_at: file.getDateCreated().toISOString(),
        })
      }

      files.sort(function (a, b) {
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      })

      return jsonResponse({ ok: true, files: files })
    }

    return jsonResponse({ ok: true, status: 'DriveUploader activo' })
  } catch (err) {
    return jsonResponse({ ok: false, error: err.message })
  }
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON)
}
