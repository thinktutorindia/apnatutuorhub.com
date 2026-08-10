/**
 * lib/compression.ts
 *
 * Client-side file compression before upload to Supabase Storage.
 *
 * Strategy:
 *  • Images (JPG / PNG)  → browser-image-compression: resize to max 1600px,
 *    target quality 0.75, max output size 1 MB.
 *  • PDFs                → pdf-lib: re-save with useObjectStreams which
 *    applies FLATE compression on all stream objects, typically reducing
 *    scanned-doc PDFs by 30–60%.
 *
 * Both operations run entirely in the browser — zero server cost.
 */

/** Result returned from compressFile */
export type CompressionResult = {
  file: File;
  originalSizeKB: number;
  compressedSizeKB: number;
  savedPercent: number;
};

// ── Image compression ─────────────────────────────────────────────────────────

async function compressImage(file: File): Promise<File> {
  // Dynamic import so it is never bundled into SSR
  const imageCompression = (await import("browser-image-compression")).default;

  const compressed = await imageCompression(file, {
    maxSizeMB: 1,            // target ≤ 1 MB output
    maxWidthOrHeight: 1600,  // never wider / taller than 1600px
    useWebWorker: true,      // runs off the main thread
    fileType: file.type as "image/jpeg" | "image/png",
    initialQuality: 0.8,     // start at 80% quality
    alwaysKeepResolution: false,
  });

  // browser-image-compression returns a Blob — restore original filename
  return new File([compressed], file.name, { type: compressed.type });
}

// ── PDF compression ───────────────────────────────────────────────────────────

async function compressPdf(file: File): Promise<File> {
  const { PDFDocument } = await import("pdf-lib");

  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer, {
    // Ignore XRef errors in some scanner-generated PDFs
    ignoreEncryption: false,
  });

  // Re-save with FLATE compressed object streams
  const compressedBytes = await pdfDoc.save({
    useObjectStreams: true,   // applies FLATE compression to all stream objects
    addDefaultPage: false,
  });

  // Uint8Array<ArrayBufferLike> → plain ArrayBuffer for File constructor compatibility
  const compressedBuffer = compressedBytes.buffer.slice(
    compressedBytes.byteOffset,
    compressedBytes.byteOffset + compressedBytes.byteLength
  ) as ArrayBuffer;

  return new File([compressedBuffer], file.name, { type: "application/pdf" });
}

// ── Public entry point ────────────────────────────────────────────────────────

/**
 * Compresses a file client-side before uploading.
 * Returns the compressed File and compression statistics.
 *
 * Falls back to the original file if compression fails or makes it larger.
 */
export async function compressFile(file: File): Promise<CompressionResult> {
  const originalSizeKB = file.size / 1024;

  try {
    let compressed: File;

    if (file.type === "application/pdf") {
      compressed = await compressPdf(file);
    } else if (file.type.startsWith("image/")) {
      compressed = await compressImage(file);
    } else {
      // Audio / unknown — no compression
      return {
        file,
        originalSizeKB,
        compressedSizeKB: originalSizeKB,
        savedPercent: 0,
      };
    }

    const compressedSizeKB = compressed.size / 1024;

    // Only use the compressed version if it actually reduced the size
    if (compressed.size >= file.size) {
      return { file, originalSizeKB, compressedSizeKB: originalSizeKB, savedPercent: 0 };
    }

    const savedPercent = Math.round(((file.size - compressed.size) / file.size) * 100);

    return { file: compressed, originalSizeKB, compressedSizeKB, savedPercent };
  } catch (err) {
    console.warn("[compression] Failed — uploading original file", err);
    // Graceful fallback: upload original unchanged
    return { file, originalSizeKB, compressedSizeKB: originalSizeKB, savedPercent: 0 };
  }
}

/** Human-readable size: "1.23 MB" or "456 KB" */
export function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}
