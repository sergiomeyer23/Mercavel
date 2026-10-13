/*Logo Mercavel*/

type Variante = 'padrao' | 'escuro' | 'mono'

interface SimboloProps {
  /** padrao = fundo claro, escuro = fundo azul-marinho, mono = uma cor so (currentColor) */
  variante?: Variante
  className?: string
}

export function Simbolo({ variante = 'padrao', className }: SimboloProps) {
  const verde = variante === 'mono' ? 'currentColor' : '#2FBF71'
  const barras = variante === 'padrao' ? '#0B1B2A' : variante === 'escuro' ? '#FFFFFF' : 'currentColor'

  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true" focusable="false" fill="none">
      <g
        transform="translate(1.3 2.5)"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="4.4"
        stroke={verde}
      >
        {/* cesta */}
        <path d="M10 30 L15.5 49.8 Q16.7 54.6 21.6 54.6 L42.4 54.6 Q47.3 54.6 48.5 49.8 L54 30" />

        {/* pessoa: cabeca e braco apoiado na cesta */}
        <circle cx="9.5" cy="12" r="4.2" fill={verde} stroke="none" />
        <path d="M9.8 16.4 C9.8 20.6 9.9 24.4 12.8 27.2" />

        {/* seta subindo (evolucao dos precos) */}
        <path d="M19 34 L28 13.5 L35 21 L47.5 5" />
        <path d="M39.1 9.8 L47.6 4.5 L44.5 14" />

        {/* barras: os precos comparados dentro da cesta */}
        <g fill={barras} stroke="none">
          <rect x="22" y="35.5" width="21" height="4.2" rx="2.1" />
          <rect x="22" y="43.2" width="14" height="4.2" rx="2.1" />
        </g>
      </g>
    </svg>
  )
}

interface LogoProps {
  variante?: Variante
  /** versao pequena, usada no cabecalho em telas estreitas */
  compacta?: boolean
  /** mostra a assinatura "Compare. Escolha. Economize." embaixo do nome */
  comSlogan?: boolean
  className?: string
}

export default function Logo({ variante = 'padrao', compacta = false, comSlogan = false, className }: LogoProps) {
  const noFundoEscuro = variante === 'escuro'

  return (
    <span className={`flex items-center gap-2.5 ${className ?? ''}`}>
      <Simbolo variante={variante} className={compacta ? 'h-7 w-7 shrink-0' : 'h-[38px] w-[38px] shrink-0'} />
      <span className="flex flex-col leading-none">
        <span
          className={[
            'font-extrabold tracking-[-0.03em]',
            noFundoEscuro ? 'text-white' : 'text-tinta-900',
            compacta ? 'text-base' : 'text-xl',
          ].join(' ')}
        >
          MERCAVEL
        </span>
        {comSlogan && !compacta && (
          <span className="mt-1 text-[10px] font-semibold text-marca-500">Compare. Escolha. Economize.</span>
        )}
      </span>
    </span>
  )
}
