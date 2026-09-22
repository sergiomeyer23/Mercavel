import { Link } from 'react-router-dom'

export default function NaoEncontrada() {
  return (
    <div className="py-20 text-center">
      <p className="text-3xl font-bold text-green-700">404</p>
      <p className="mt-2 text-gray-500">essa página não existe</p>
      <Link to="/" className="mt-4 inline-block rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700">
        voltar pro início
      </Link>
    </div>
  )
}
