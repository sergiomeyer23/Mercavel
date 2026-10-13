import { useState } from 'react'
import type { Market } from '../types'

// o escudo de iniciais é quadrado, mas as logos oficiais têm proporções bem
// diferentes entre os mercados (de 1,5:1 até 3:1). por isso a imagem usa altura
// fixa com largura livre - dentro de um quadrado as mais largas ficariam
// ilegíveis no tamanho pequeno.
const ESCUDO = {
  sm: 'h-6 w-6 rounded-md text-[10px]',
  md: 'h-9 w-9 rounded-lg text-xs',
  lg: 'h-14 w-14 rounded-xl text-base',
}

const LOGO = {
  sm: 'h-6 max-w-[72px] rounded',
  md: 'h-9 max-w-[108px] rounded-md',
  lg: 'h-14 max-w-[168px] rounded-lg',
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
  tamanho?: keyof typeof ESCUDO
}

export default function MarketLogo({ mercado, tamanho = 'md' }: MarketLogoProps) {
  const [naoCarregou, setNaoCarregou] = useState(false)

  // o nome do mercado sempre aparece do lado, então a imagem fica decorativa
  if (mercado.logo && !naoCarregou) {
    return (
      <img
        src={mercado.logo}
        alt=""
        className={`${LOGO[tamanho]} w-auto shrink-0 bg-white object-contain p-0.5`}
        onError={() => setNaoCarregou(true)}
      />
    )
  }

  return (
    <span
      className={`${ESCUDO[tamanho]} flex shrink-0 items-center justify-center font-bold text-white`}
      style={{ backgroundColor: mercado.cor }}
      aria-hidden="true"
    >
      {iniciais(mercado.shortName)}
    </span>
  )
}
