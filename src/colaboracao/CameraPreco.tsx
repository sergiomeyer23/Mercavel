import { useEffect, useRef, useState } from 'react'
import type { Captura } from './tipos'

export interface FotoCapturada {
  foto: string
  captura: Captura
}

const LARGURA_MAXIMA = 800

function posicaoAtual(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolver) => {
    if (!('geolocation' in navigator)) return resolver(null)
    navigator.geolocation.getCurrentPosition(
      (p) => resolver({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolver(null),
      { timeout: 8000, maximumAge: 60000 },
    )
  })
}

function reduzir(origem: CanvasImageSource, largura: number, altura: number): string {
  const escala = Math.min(1, LARGURA_MAXIMA / largura)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(largura * escala)
  canvas.height = Math.round(altura * escala)
  canvas.getContext('2d')?.drawImage(origem, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', 0.7)
}

/**
 * Foto da etiqueta de preço. A câmera do próprio app grava a hora e a localização no momento do clique,
 * então ninguém consegue editar isso depois. Foto de arquivo também é aceita, mas vai pra revisão manual.
 */
export default function CameraPreco({ onFoto }: { onFoto: (f: FotoCapturada | null) => void }) {
  const video = useRef<HTMLVideoElement>(null)
  const fluxo = useRef<MediaStream | null>(null)
  const [aberta, setAberta] = useState(false)
  const [previa, setPrevia] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  function fechar() {
    fluxo.current?.getTracks().forEach((t) => t.stop())
    fluxo.current = null
    setAberta(false)
  }
  useEffect(() => fechar, [])

  async function abrir() {
    setErro(null)
    try {
      fluxo.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      setAberta(true)
      requestAnimationFrame(() => {
        if (video.current && fluxo.current) {
          video.current.srcObject = fluxo.current
          void video.current.play()
        }
      })
    } catch {
      setErro('Não consegui abrir a câmera. Libere a permissão ou envie uma foto de arquivo (ela passa por revisão).')
    }
  }

  async function tirar() {
    const v = video.current
    if (!v || !v.videoWidth) return
    const foto = reduzir(v, v.videoWidth, v.videoHeight)
    const feitaEm = new Date().toISOString()
    fechar()
    const pos = await posicaoAtual()
    setPrevia(foto)
    onFoto({ foto, captura: { feitaEm, lat: pos?.lat ?? null, lng: pos?.lng ?? null, origem: 'camera_app' } })
  }

  function doArquivo(arquivo: File | undefined) {
    if (!arquivo) return
    const url = URL.createObjectURL(arquivo)
    const img = new Image()
    img.onload = () => {
      const foto = reduzir(img, img.naturalWidth, img.naturalHeight)
      URL.revokeObjectURL(url)
      setPrevia(foto)
      onFoto({ foto, captura: { feitaEm: new Date(arquivo.lastModified).toISOString(), lat: null, lng: null, origem: 'arquivo' } })
    }
    img.src = url
  }

  return (
    <div className="space-y-2">
      {aberta && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-black">
          <video ref={video} playsInline muted className="max-h-72 w-full object-contain" />
          <div className="flex gap-2 bg-gray-900 p-2">
            <button type="button" onClick={tirar} className="flex-1 rounded-lg bg-marca-600 py-2 text-sm font-semibold text-white">
              tirar foto
            </button>
            <button type="button" onClick={fechar} className="rounded-lg border border-gray-600 px-3 py-2 text-sm text-gray-200">
              cancelar
            </button>
          </div>
        </div>
      )}
      {previa && !aberta && (
        <img src={previa} alt="foto da etiqueta de preço" className="max-h-56 rounded-xl border border-gray-200" />
      )}
      {!aberta && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={abrir}
            className="rounded-lg bg-marca-600 px-4 py-2 text-sm font-semibold text-white hover:bg-marca-700"
          >
            {previa ? 'tirar outra foto' : 'abrir câmera'}
          </button>
          <label className="cursor-pointer rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-600 hover:border-marca-400">
            enviar foto de arquivo
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => doArquivo(e.target.files?.[0])} />
          </label>
        </div>
      )}
      {erro && <p className="text-xs text-amber-700">{erro}</p>}
    </div>
  )
}
