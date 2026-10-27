import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Busca from './pages/Busca'
import Produto from './pages/Produto'
import Categorias from './pages/Categorias'
import Categoria from './pages/Categoria'
import Mercados from './pages/Mercados'
import Mercado from './pages/Mercado'
import Cesta from './pages/Cesta'
import Dashboard from './pages/Dashboard'
import NaoEncontrada from './pages/NaoEncontrada'
import { CestaProvider } from './context/BasketContext'

export default function App() {
  return (
    <CestaProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/busca" element={<Busca />} />
            <Route path="/produto/:id" element={<Produto />} />
            <Route path="/categorias" element={<Categorias />} />
            <Route path="/categoria/:slug" element={<Categoria />} />
            <Route path="/mercados" element={<Mercados />} />
            <Route path="/mercado/:slug" element={<Mercado />} />
            <Route path="/cesta" element={<Cesta />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="*" element={<NaoEncontrada />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </CestaProvider>
  )
}
