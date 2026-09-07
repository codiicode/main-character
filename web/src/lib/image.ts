/** Resize an image file to a square 512px JPEG/PNG blob in the browser, then upload it. */
export async function resizeImage(file: File, size = 512): Promise<Blob> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image()
      i.onload = () => res(i)
      i.onerror = () => rej(new Error('Could not read that image'))
      i.src = url
    })
    const c = document.createElement('canvas')
    c.width = size
    c.height = size
    const g = c.getContext('2d')!
    // cover-crop to square
    const s = Math.min(img.width, img.height)
    const sx = (img.width - s) / 2
    const sy = (img.height - s) / 2
    g.drawImage(img, sx, sy, s, s, 0, 0, size, size)
    const keepAlpha = file.type === 'image/png'
    return await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('encode failed'))), keepAlpha ? 'image/png' : 'image/jpeg', 0.9))
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function uploadImage(blob: Blob): Promise<string> {
  const r = await fetch('/api/upload', { method: 'POST', headers: { 'content-type': blob.type }, body: blob })
  const j = (await r.json()) as { url?: string; error?: string }
  if (!r.ok || !j.url) throw new Error(j.error ?? 'Upload failed')
  return j.url
}
