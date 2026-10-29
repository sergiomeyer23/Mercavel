import { useEffect, useRef, useState } from 'react'

// BarcodeDetector ainda não está em todos os navegadores (Chrome no Android tem); sem ele, o código é digitado
interface DetectorDeCodigo {
  detect(fonte: CanvasImageSource): Promise<{ rawValue: string }[]>
}
type ConstrutorDetector = new (opcoes?: { formats: string[] }) => DetectorDeCodigo

export const temLeitor = () => 'BarcodeDetector' in window

export default function LeitorCodigo({ onCodigo }: { onCodigo: (codigo: string) => void }) {
  const video = useRef<HTMLVideoElement>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    let parar = false
    let fluxo: MediaStream | null = null
    async function iniciar() {
      try {
        const Detector = (window as unknown as { BarcodeDetector: ConstrutorDetector }).BarcodeDetector
        const detector = new Detector({ formats: ['ean_13', 'ean_8', 'upc_a'] })
        fluxo = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
        if (!video.current) return
        video.current.srcObject = fluxo
        await video.current.play()
        const olhar = async () => {
          if (parar || !video.current) return
          try {
            const achados = await detector.detect(video.current)
            if (achados.length > 0) return onCodigo(achados[0].rawValue)
          } catch {
            // quadro sem imagem ainda
          }
          setTimeout(olhar, 250)
        }
        void olhar()
      } catch {
        setErro('Não consegui abrir a câmera para ler o código.')
      }
    }
    void iniciar()
    return () => {
      parar = true
      fluxo?.getTracks().forEach((t) => t.stop())
    }
  }, [onCodigo])

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-black">
      <video ref={video} playsInline muted className="max-h-60 w-full object-contain" />
      {erro && <p className="bg-white p-2 text-xs text-amber-700">{erro}</p>}
    </div>
  )
}
