import type { Metadata } from 'next'
import { supabase } from '@/lib/supabase'

type Props = { params: Promise<{ code: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params
  let bday = 'a friend'
  let image: string | undefined
  try {
    const { data } = await supabase
      .from('parties')
      .select('birthday_person_name, birthday_person_photo')
      .eq('invite_code', code)
      .single()
    if (data) {
      bday = data.birthday_person_name || bday
      image = data.birthday_person_photo || undefined
    }
  } catch {
    // generic preview
  }
  const title = `Envíale a ${bday} un mensaje en una botella 🍾`
  const description = `${bday} celebra su cumpleaños en barco. Mándale un deseo, una foto o un video — irá en su periódico de cumpleaños.`
  const images = image ? [{ url: image, width: 800, height: 800, alt: title }] : []
  return {
    title,
    description,
    openGraph: { title, description, type: 'website', images },
    twitter: { card: image ? 'summary_large_image' : 'summary', title, description, images: image ? [image] : [] },
  }
}

export default function BottleLayout({ children }: { children: React.ReactNode }) {
  return children
}
