// Shrinks an image (File or data URL) and returns a small JPEG data URL
export function resizeImage(source, maxSize, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const isFile = typeof source !== 'string'
    const url = isFile ? URL.createObjectURL(source) : source

    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      if (isFile) URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.onerror = () => {
      if (isFile) URL.revokeObjectURL(url)
      reject(new Error('Could not read image'))
    }
    img.src = url
  })
}