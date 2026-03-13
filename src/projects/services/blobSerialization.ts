export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const dataUrl = reader.result as string
      const base64 = dataUrl.split(',')[1]
      if (base64) {
        resolve(base64)
      } else {
        reject(new Error('Failed to extract base64 from data URL'))
      }
    }
    reader.onerror = () => {
      reject(reader.error ?? new Error('Unknown error reading blob'))
    }
    reader.readAsDataURL(blob)
  })
}

export function base64ToBlob(base64: string, type: string): Blob {
  const binaryString = atob(base64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return new Blob([bytes], { type })
}
