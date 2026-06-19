import { supabase } from '@/lib/supabase'

const PROD_URL = 'https://birthday-app-seven-swart.vercel.app'

function buildEmail(name: string, link: string) {
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#fff9ee;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff9ee;padding:28px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 14px 40px rgba(45,58,74,0.12);">
        <tr><td style="background:linear-gradient(135deg,#ffd23f,#ff7a59);padding:30px 28px 26px;text-align:center;">
          <div style="font-size:40px;line-height:1;">🚢⚓🍋</div>
          <h1 style="margin:14px 0 4px;font-family:Georgia,'Times New Roman',serif;font-size:30px;font-weight:800;color:#2d3a4a;line-height:1.15;">¡Feliz Cumpleaños, ${name}!</h1>
          <p style="margin:0;font-size:14px;color:#5b3b22;font-weight:600;">Tu tripulación tiene una sorpresa para ti…</p>
        </td></tr>
        <tr><td style="padding:28px 30px 8px;">
          <p style="margin:0 0 16px;font-family:Georgia,serif;font-size:16px;line-height:1.7;color:#2d3a4a;">
            Capitán ${name}, hoy zarpamos. ⛵ Mientras te preparas para tu paseo en barco al estilo gondolero veneciano, queremos contarte un secreto:
          </p>
          <p style="margin:0 0 16px;font-family:Georgia,serif;font-size:16px;line-height:1.7;color:#2d3a4a;">
            Toda la tripulación estuvo conspirando. Cada quien tuvo un papel oficial, misiones secretas, y hasta tus seres queridos que no pudieron estar a bordo te mandaron mensajes flotando en botellas. 🍾
          </p>
          <p style="margin:0 0 22px;font-family:Georgia,serif;font-size:16px;line-height:1.7;color:#2d3a4a;">
            Lo juntamos todo — fotos, recuerdos, misiones y mensajes — en un regalo hecho para ti:
          </p>
          <div style="text-align:center;padding:6px 0 18px;">
            <a href="${link}" style="display:inline-block;background:#ff7a59;color:#ffffff;text-decoration:none;font-family:Georgia,serif;font-weight:700;font-size:17px;padding:16px 30px;border-radius:16px;box-shadow:0 8px 20px rgba(255,122,89,0.4);">
              📰 Abre tu Periódico de Cumpleaños
            </a>
          </div>
          <p style="margin:0 0 6px;text-align:center;font-size:13px;color:#8a93a0;">Ábrelo despacito… hay una botella esperándote al final. 🌊</p>
        </td></tr>
        <tr><td style="padding:18px 30px 30px;border-top:1px solid #f0e7d4;text-align:center;">
          <p style="margin:0;font-family:Georgia,serif;font-style:italic;font-size:15px;color:#5b6a7d;">Con todo el cariño,<br>tu tripulación 💛</p>
        </td></tr>
      </table>
      <p style="margin:16px 0 0;font-size:11px;color:#b7ad98;letter-spacing:0.12em;text-transform:uppercase;">The Boat Day Times</p>
    </td></tr>
  </table>
</body></html>`
}

export async function POST(req: Request) {
  try {
    const { partyId } = await req.json()
    if (!partyId) return Response.json({ ok: false, error: 'Falta el partyId.' }, { status: 400 })

    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) return Response.json({ ok: false, error: 'Falta configurar RESEND_API_KEY en Vercel. (Ver instrucciones de Pili.)' }, { status: 500 })

    const { data: party } = await supabase
      .from('parties')
      .select('id, birthday_person_name, birthday_person_email')
      .eq('id', partyId)
      .single()

    if (!party) return Response.json({ ok: false, error: 'No se encontró la fiesta.' }, { status: 404 })
    if (!party.birthday_person_email) return Response.json({ ok: false, error: 'Primero agrega el email del cumpleañero en el admin.' }, { status: 400 })

    const name = party.birthday_person_name || 'Capitán'
    const link = `${PROD_URL}/newspaper/${party.id}`
    const from = process.env.BIRTHDAY_FROM || 'Tu Tripulacion 🚢 <onboarding@resend.dev>'

    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: party.birthday_person_email,
        subject: `🚢 ${name}, tu tripulación tiene una sorpresa para ti`,
        html: buildEmail(name, link),
      }),
    })

    if (!r.ok) {
      const detail = await r.text()
      return Response.json({ ok: false, error: `No se pudo enviar (${r.status}). ${detail.slice(0, 200)}` }, { status: 502 })
    }

    return Response.json({ ok: true, to: party.birthday_person_email })
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : 'Error inesperado.' }, { status: 500 })
  }
}
