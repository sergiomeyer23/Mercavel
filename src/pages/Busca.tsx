import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { categories, products } from '../data'
import ProductCard from '../components/ProductCard'

function semAcento(texto: string) {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

function chip(ativo: boolean) {
  return (
    'rounded-full px-3 py-1 text-xs font-semibold ' +
    (ativo ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')
  )
}

export default function Busca() {
  const [params] = useSearchParams()
  const q = params.get('q') ?? ''
  const [categoria, setCategoria] = useState('todas')

  const termo = semAcento(q.trim())
  let achados = products
  if (termo) {
    achados = products.filter((p) => semAcento(`${p.name} ${p.brand} ${p.ean ?? ''}`).includes(termo))
  }

  const filtrados = categoria === 'todas' ? achados : achados.filter((p) => p.categoryId === categoria)
  const catsDoResultado = [...new Set(achados.map((p) => p.categoryId))]

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">
        {q ? `Resultados pra "${q}"` : 'Todos os produtos'}
      </h1>
      <p className="text-sm text-gray-500">{achados.length} produtos encontrados</p>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => setCategoria('todas')} className={chip(categoria === 'todas')}>
          todas ({achados.length})
        </button>
        {catsDoResultado.map((id) => {
          const cat = categories.find((c) => c.id === id)
          if (!cat) return null
          const qtd = achados.filter((p) => p.categoryId === id).length
          return (
            <button key={id} onClick={() => setCategoria(id)} className={chip(categoria === id)}>
              {cat.name} ({qtd})
            </button>
          )
        })}
      </div>

      {filtrados.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
          <p className="text-sm text-gray-500">Nada encontrado. Tenta buscar algo tipo "arroz" ou "leite".</p>
          <Link to="/categorias" className="mt-3 inline-block text-sm font-semibold text-green-700 hover:underline">
            ver categorias
          </Link>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {filtrados.map((p) => (
            <ProductCard key={p.id} produto={p} />
          ))}
        </div>
      )}
    </div>
  )
}
