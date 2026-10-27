// quadradinho colorido com o emoji do produto ou da categoria
const tamanhos = {
  sm: 'h-8 w-8 rounded-lg text-base',
  md: 'h-11 w-11 rounded-xl text-2xl',
  lg: 'h-16 w-16 rounded-2xl text-4xl',
}

export default function IconeComida({ emoji, tamanho = 'md' }: { emoji: string; tamanho?: keyof typeof tamanhos }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 select-none items-center justify-center bg-gradient-to-br from-marca-50 to-marca-100 ring-1 ring-marca-200/70 ${tamanhos[tamanho]}`}
    >
      {emoji}
    </span>
  )
}
