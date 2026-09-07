import { useState } from 'react'
import { Button } from './ui'

/**
 * Draws a 1200×630 share card on a canvas in the browser and hands it to the OS share sheet
 * (or a download / clipboard fallback). No server rendering needed.
 */
export type ShareCardInput = {
  title: string // "$OGLE" or "ogle"
  subtitle: string // "A coin for @ogle" / "@ogle on MAIN"
  line: string // "1% of every trade goes to @ogle"
  stat?: string // "+0.412 ETH paid so far"
  avatar?: string | null
  hue: number
  url: string
  endorsed?: boolean
}

const proxied = (u: string) => (u.startsWith('https://prod-fomo-profile-pics') || u.startsWith('https://token-media') ? `/api/img?u=${encodeURIComponent(u)}` : u)

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((res) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => res(img)
    img.onerror = () => res(null)
    img.src = src
  })
}

export async function renderShareCard(i: ShareCardInput): Promise<Blob> {
  const W = 1200, H = 630
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')!
  await (document as Document & { fonts?: FontFaceSet }).fonts?.load('700 64px Satoshi').catch(() => {})

  // background: deep navy + aurora
  g.fillStyle = '#060510'
  g.fillRect(0, 0, W, H)
  const orb = (x: number, y: number, r: number, col: string) => {
    const gr = g.createRadialGradient(x, y, 0, x, y, r)
    gr.addColorStop(0, col)
    gr.addColorStop(1, 'rgba(0,0,0,0)')
    g.fillStyle = gr
    g.fillRect(0, 0, W, H)
  }
  orb(180, 80, 620, `hsl(${i.hue} 80% 55% / .55)`)
  orb(1050, 560, 560, 'rgba(81,106,246,.45)')
  orb(700, 620, 420, 'rgba(253,93,211,.18)')

  // glass panel
  const px = 60, py = 60, pw = W - 120, ph = H - 120, pr = 40
  g.save()
  g.beginPath()
  g.roundRect(px, py, pw, ph, pr)
  g.fillStyle = 'rgba(255,255,255,.07)'
  g.fill()
  g.strokeStyle = 'rgba(255,255,255,.14)'
  g.lineWidth = 2
  g.stroke()
  g.restore()

  // avatar
  const ax = 150, ay = H / 2, ar = 120
  g.save()
  g.shadowColor = `hsl(${i.hue} 80% 60% / .6)`
  g.shadowBlur = 70
  g.beginPath()
  g.arc(ax + ar, ay, ar, 0, Math.PI * 2)
  g.fillStyle = `hsl(${i.hue} 30% 20%)`
  g.fill()
  g.restore()
  const img = i.avatar ? await loadImage(proxied(i.avatar.replace('_small.', '.'))) : null
  g.save()
  g.beginPath()
  g.arc(ax + ar, ay, ar, 0, Math.PI * 2)
  g.clip()
  if (img) g.drawImage(img, ax, ay - ar, ar * 2, ar * 2)
  g.restore()
  g.beginPath()
  g.arc(ax + ar, ay, ar, 0, Math.PI * 2)
  g.strokeStyle = 'rgba(255,255,255,.25)'
  g.lineWidth = 3
  g.stroke()

  // text
  const tx = ax + ar * 2 + 60
  g.fillStyle = '#f7f7f7'
  g.font = '700 72px Satoshi, system-ui, sans-serif'
  g.fillText(i.title, tx, 250)
  if (i.endorsed) {
    const w = g.measureText(i.title).width
    g.fillStyle = '#516af6'
    g.beginPath()
    g.arc(tx + w + 36, 226, 18, 0, Math.PI * 2)
    g.fill()
    g.strokeStyle = '#f7f7f7'
    g.lineWidth = 5
    g.beginPath()
    g.moveTo(tx + w + 26, 227)
    g.lineTo(tx + w + 33, 234)
    g.lineTo(tx + w + 47, 218)
    g.stroke()
  }
  g.fillStyle = '#9899a3'
  g.font = '500 32px Satoshi, system-ui, sans-serif'
  g.fillText(i.subtitle, tx, 300)
  g.fillStyle = '#21c95e'
  g.font = '700 40px Satoshi, system-ui, sans-serif'
  g.fillText(i.line, tx, 372)
  if (i.stat) {
    g.fillStyle = '#f7f7f7'
    g.font = '500 30px Satoshi, system-ui, sans-serif'
    g.fillText(i.stat, tx, 422)
  }

  // footer
  g.fillStyle = 'rgba(255,255,255,.55)'
  g.font = '700 26px Satoshi, system-ui, sans-serif'
  g.fillText('main', 110, H - 100)
  g.fillStyle = 'rgba(255,255,255,.45)'
  g.font = '500 24px Satoshi, system-ui, sans-serif'
  g.fillText(i.url.replace(/^https?:\/\//, ''), 190, H - 100)

  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('canvas'))), 'image/png'))
}

export function ShareButton({ input, label = 'Share', size = 'sm' }: { input: ShareCardInput; label?: string; size?: 'sm' | 'md' | 'lg' }) {
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'copied' | 'error'>('idle')
  async function share() {
    try {
      setState('busy')
      const blob = await renderShareCard(input)
      const file = new File([blob], `${input.title.replace(/\W+/g, '')}-main.png`, { type: 'image/png' })
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
      if (nav.share && nav.canShare?.({ files: [file] })) {
        await nav.share({ files: [file], title: input.title, text: `${input.line} ${input.url}` })
        setState('done')
        return
      }
      // desktop: copy image to clipboard and open a tweet composer with the text
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
        setState('copied')
      } catch {
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = file.name
        a.click()
        setState('done')
      }
      window.open(`https://x.com/intent/post?text=${encodeURIComponent(`${input.line}\n${input.url}`)}`, '_blank')
    } catch {
      setState('error')
    }
    setTimeout(() => setState('idle'), 2500)
  }
  return (
    <Button variant="glass" size={size} onClick={share} disabled={state === 'busy'}>
      {state === 'busy' ? 'Making card' : state === 'copied' ? 'Card copied, paste it in X' : state === 'done' ? 'Shared' : state === 'error' ? 'Could not share' : label}
    </Button>
  )
}

// Dev-only hook so the card can be previewed from the browser console / automation.
if (import.meta.env.DEV) (window as unknown as { __renderShareCard?: typeof renderShareCard }).__renderShareCard = renderShareCard
