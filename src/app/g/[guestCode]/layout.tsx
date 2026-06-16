import type { Metadata } from 'next'
import { supabase } from '@/lib/supabase'

type Props = { params: Promise<{ guestCode: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { guestCode } = await params

  let firstName = ''
  let bday = 'a special'
  let image: string | undefined

  try {
    const { data } = await supabase
      .from('guests')
      .select('name, photo, parties(birthday_person_name, birthday_person_photo)')
      .eq('invite_code', guestCode)
      .single()

    if (data) {
      const guest = data as unknown as { name?: string; photo?: string | null; parties?: { birthday_person_name?: string; birthday_person_photo?: string | null } }
      firstName = (guest.name || '').split(' ')[0]
      bday = guest.parties?.birthday_person_name || bday
      image = guest.photo || guest.parties?.birthday_person_photo || undefined
    }
  } catch {
    // fall through to generic invite preview
  }

  const title = firstName ? `${firstName}, you're invited! 🚢🎉` : "You're invited! 🚢🎉"
  const description = `${bday}'s Birthday Boat Day — tap to open your personal invitation.`
  const images = image ? [{ url: image, width: 800, height: 800, alt: title }] : []

  return {
    title,
    description,
    openGraph: { title, description, type: 'website', images },
    twitter: { card: image ? 'summary_large_image' : 'summary', title, description, images: image ? [image] : [] },
  }
}

export default function GuestLayout({ children }: { children: React.ReactNode }) {
  return children
}
