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
  const title = `Send ${bday} a message in a bottle 🍾`
  const description = `${bday} is having a birthday boat day. Float them a wish, a photo, or a video — it goes into their birthday newspaper.`
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
