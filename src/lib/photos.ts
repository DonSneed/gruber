import { supabase } from './supabase'

export interface Photo {
  id: string
  family_id: string
  story_id: string | null
  task_id: string | null
  event_id: string | null
  storage_path: string
  created_by: string | null
  created_at: string
}

const MAX_DIMENSION = 1600
const JPEG_QUALITY = 0.8
const SIGNED_URL_TTL = 60 * 60 // 1 hour

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = (err) => {
      URL.revokeObjectURL(url)
      reject(err)
    }
    img.src = url
  })
}

async function compressImage(file: File): Promise<Blob> {
  const img = await loadImage(file)
  const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.width * scale)
  canvas.height = Math.round(img.height * scale)

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas not supported')
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Image compression failed'))),
      'image/jpeg',
      JPEG_QUALITY,
    )
  })
}

export async function uploadPhoto(
  file: File,
  familyId: string,
  profileId: string,
  target: { storyId?: string; taskId?: string; eventId?: string },
): Promise<void> {
  const blob = await compressImage(file)
  const path = `${familyId}/${crypto.randomUUID()}.jpg`

  const { error: uploadError } = await supabase.storage.from('memories').upload(path, blob, {
    contentType: 'image/jpeg',
  })
  if (uploadError) throw uploadError

  const { error: insertError } = await supabase.from('photos').insert({
    family_id: familyId,
    story_id: target.storyId ?? null,
    task_id: target.taskId ?? null,
    event_id: target.eventId ?? null,
    storage_path: path,
    created_by: profileId,
  })
  if (insertError) throw insertError
}

export async function listPhotos(filter: { storyId?: string; taskId?: string; eventId?: string }): Promise<Photo[]> {
  let query = supabase.from('photos').select('*').order('created_at', { ascending: false })
  if (filter.storyId) query = query.eq('story_id', filter.storyId)
  if (filter.taskId) query = query.eq('task_id', filter.taskId)
  if (filter.eventId) query = query.eq('event_id', filter.eventId)
  const { data } = await query
  return data ?? []
}

export async function getPhotoUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from('memories').createSignedUrl(path, SIGNED_URL_TTL)
  return data?.signedUrl ?? null
}

export async function deletePhoto(photo: Photo): Promise<void> {
  await supabase.storage.from('memories').remove([photo.storage_path])
  await supabase.from('photos').delete().eq('id', photo.id)
}