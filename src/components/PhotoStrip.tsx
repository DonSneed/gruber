import { useEffect, useRef, useState } from 'react'
import { deletePhoto, getPhotoUrl, listPhotos, uploadPhoto } from '../lib/photos'
import type { Photo } from '../lib/photos'

interface PhotoStripProps {
  familyId: string
  profileId: string
  storyId?: string
  taskId?: string
}

export function PhotoStrip({ familyId, profileId, storyId, taskId }: PhotoStripProps) {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    load()
  }, [storyId, taskId])

  async function load() {
    const data = await listPhotos({ storyId, taskId })
    setPhotos(data)

    const entries = await Promise.all(
      data.map(async (photo) => [photo.id, await getPhotoUrl(photo.storage_path)] as const),
    )
    setUrls(Object.fromEntries(entries.filter(([, url]) => url) as [string, string][]))
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError(null)
    try {
      await uploadPhoto(file, familyId, profileId, { storyId, taskId })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleDelete(photo: Photo) {
    if (!confirm('Delete this photo?')) return
    await deletePhoto(photo)
    setPhotos((prev) => prev.filter((p) => p.id !== photo.id))
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {photos.map((photo) => (
          <div key={photo.id} className="group relative shrink-0">
            {urls[photo.id] && (
              <a href={urls[photo.id]} target="_blank" rel="noreferrer">
                <img
                  src={urls[photo.id]}
                  alt=""
                  className="h-20 w-20 rounded object-cover"
                />
              </a>
            )}
            <button
              onClick={() => handleDelete(photo)}
              className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-ink/60 text-xs text-white opacity-0 group-hover:opacity-100"
              title="Delete photo"
            >
              &times;
            </button>
          </div>
        ))}

        <label className="flex h-20 w-20 shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded border border-dashed border-stone/40 text-stone hover:bg-stone/5">
          {uploading ? (
            <span className="text-xs">Uploading...</span>
          ) : (
            <>
              <span className="text-xl">+</span>
              <span className="text-xs">Photo</span>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            disabled={uploading}
            className="hidden"
          />
        </label>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}