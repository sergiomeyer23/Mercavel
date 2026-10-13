import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import type { FormEvent } from 'react'
import { useCesta } from '../context/BasketContext'
import Logo from './Logo'
import { caminhoDaBusca } from '../utils'

function CampoBusca() {
  const [texto, setTexto] = useState('')
  const navigate = useNavigate()

  function enviar(e: FormEvent) {
    e.preventDefault()
    if (!texto.trim()) return
    navigate(caminhoDaBusca(texto))
    setTexto('')
  }

  return (
    <form onSubmit={enviar}>
      <input
        type="search"
        aria-label="buscar produto"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="buscar produto..."
        className="w-44 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-marca-500 focus:outline-none"
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
          <Link to="/" aria-label="página inicial">
            <Logo />
          </Link>

          <nav className="ml-2 hidden items-center gap-1 sm:flex">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === '/'}
                className={({ isActive }) =>
                  'rounded-lg px-3 py-1.5 text-sm ' +
                  (isActive ? 'bg-marca-50 font-semibold text-marca-700' : 'text-gray-600 hover:bg-gray-100')
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
            <Link to="/cesta" className="rounded-lg bg-marca-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-marca-700">
              Cesta ({qtdItens})
            </Link>
            <button
              type="button"
              aria-label={menuAberto ? 'fechar menu' : 'abrir menu'}
              aria-expanded={menuAberto}
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
          <Logo compacta />
          <p className="mt-2">
            Comparador de preços de supermercados de Cascavel/PR. Os preços são coletados automaticamente
            nos sites dos mercados: são preços de e-commerce, não da loja física.
          </p>
        </div>
      </footer>
    </div>
  )
}
