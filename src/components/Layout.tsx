import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useCesta } from '../context/BasketContext'

function CampoBusca() {
  const [texto, setTexto] = useState('')
  const navigate = useNavigate()

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (texto.trim()) {
          navigate('/busca?q=' + encodeURIComponent(texto.trim()))
          setTexto('')
        }
      }}
    >
      <input
        type="search"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="buscar produto..."
        className="w-44 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-green-500 focus:outline-none"
      />
    </form>
  )
}

const links = [
  { to: '/', texto: 'Início' },
  { to: '/categorias', texto: 'Categorias' },
  { to: '/mercados', texto: 'Mercados' },
  { to: '/dashboard', texto: 'Dashboard' },
]

export default function Layout() {
  const [menuAberto, setMenuAberto] = useState(false)
  const { qtdItens } = useCesta()

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
          <Link to="/" className="flex items-center gap-2 font-bold text-gray-900">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-600 text-white">🛒</span>
            Cesta Cascavel
          </Link>

          <nav className="ml-2 hidden items-center gap-1 sm:flex">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === '/'}
                className={({ isActive }) =>
                  'rounded-lg px-3 py-1.5 text-sm ' +
                  (isActive ? 'bg-green-50 font-semibold text-green-700' : 'text-gray-600 hover:bg-gray-100')
                }
              >
                {l.texto}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <div className="hidden md:block">
              <CampoBusca />
            </div>
            <Link to="/cesta" className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-green-700">
              Cesta ({qtdItens})
            </Link>
            <button
              className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm sm:hidden"
              onClick={() => setMenuAberto(!menuAberto)}
            >
              ☰
            </button>
          </div>
        </div>

        {menuAberto && (
          <nav className="border-t border-gray-200 px-4 py-2 sm:hidden">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setMenuAberto(false)}
                className="block rounded-lg px-3 py-2 text-sm text-gray-700"
              >
                {l.texto}
              </Link>
            ))}
          </nav>
        )}
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        <Outlet />
      </main>

      <footer className="border-t border-gray-200 bg-white py-6">
        <div className="mx-auto max-w-5xl px-4 text-xs text-gray-500">
          <p className="font-semibold text-gray-700">Cesta Cascavel</p>
          <p className="mt-1">
            Comparador de preços de supermercados de Cascavel/PR. Os produtos e preços do site são fictícios,
            colocados só pra demonstrar o funcionamento.
          </p>
        </div>
      </footer>
    </div>
  )
}
