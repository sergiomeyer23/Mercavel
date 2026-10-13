import { useState } from 'react'
import type { Market } from '../types'

const TAMANHOS = {
  sm: 'h-6 w-6 rounded-md text-[10px]',
  md: 'h-9 w-9 rounded-lg text-xs',
  lg: 'h-14 w-14 rounded-xl text-base',
}

function iniciais(nome: string) {
  const palavras = nome.split(' ').filter(Boolean)
  if (palavras.length > 1) {
    return (palavras[0][0] + palavras[1][0]).toUpperCase()
  }
  return nome.slice(0, 2).toUpperCase()
}

interface MarketLogoProps {
  mercado: Market
  tamanho?: keyof typeof TAMANHOS
}

export default function MarketLogo({ mercado, tamanho = 'md' }: MarketLogoProps) {
  const [naoCarregou, setNaoCarregou] = useState(false)
  const classe = TAMANHOS[tamanho]

  // o name do mercado sempre aparece do lado, entao a imagem fica decorativa
  if (mercado.logo && !naoCarregou) {
    return (
      <img
        src={mercado.logo}
        alt=""
        className={`${classe} shrink-0 bg-white object-contain p-0.5`}
        onError={() => setNaoCarregou(true)}
      />
    )
  }

  return (
    <span
      className={`${classe} flex shrink-0 items-center justify-center font-bold text-white`}
      style={{ backgroundColor: mercado.cor }}
      aria-hidden="true"
    >
      {iniciais(mercado.shortName)}
    </span>
  )
}
