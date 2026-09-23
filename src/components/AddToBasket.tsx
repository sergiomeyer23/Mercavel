import { useCesta } from '../context/BasketContext'

export default function AddToBasket({ productId }: { productId: string }) {
  const { adicionar } = useCesta()

  return (
    <button
      onClick={() => adicionar(productId)}
      className="rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs font-semibold text-gray-600 hover:border-green-500 hover:text-green-700"
    >
      + cesta
    </button>
  )
}
