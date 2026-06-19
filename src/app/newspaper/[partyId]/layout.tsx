import type { Metadata } from 'next'
import { supabase } from '@/lib/supabase'

type Props = { params: Promise<{ partyId: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { partyId } = await params
  let name = ''
  let image: string | undefined
  try {
    const { data } = await supabase
      .from('parties')
      .select('birthday_person_name, birthday_person_photo, newspaper')
      .eq('id', partyId)
      .single()
    if (data) {
      name = data.birthday_person_name || ''
      const np = (data.newspaper ?? {}) as { cover_photo?: string | null; host_photos?: string[] }
      image = np.cover_photo || (np.host_photos && np.host_photos[0]) || data.birthday_person_photo || undefined
    }
  } catch {
    // generic preview
  }

  const who = name || 'el cumpleañero'
  const title = `📰 El Periódico de Cumpleaños de ${who}`
  const description = `${who}, tu tripulación tiene una sorpresa para ti 🚢 — toca para abrir tu regalo: fotos, recuerdos, misiones y mensajes de toda la tripulación 💛`
  const images = image ? [{ url: image, width: 800, height: 800, alt: title }] : []

  return {
    title,
    description,
    openGraph: { title, description, type: 'website', images },
    twitter: { card: image ? 'summary_large_image' : 'summary', title, description, images: image ? [image] : [] },
  }
}

export default function NewspaperLayout({ children }: { children: React.ReactNode }) {
  return children
}
