import type { ReactNode } from 'react'

interface ChipProps {
  ativo: boolean
  onClick: () => void
  children: ReactNode
}

export default function Chip({ ativo, onClick, children }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'rounded-full px-3 py-1 text-xs font-semibold ' +
        (ativo ? 'bg-marca-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')
      }
    >
      {children}
    </button>
  )
}
