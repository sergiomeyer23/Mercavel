import { Link, useSearchParams } from 'react-router-dom'
import { categories, products } from '../data'
import Chip from '../components/Chip'
import ProductCard from '../components/ProductCard'
import { precosDoProduto } from '../utils'

function semAcento(texto: string) {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

type Ordem = 'relevancia' | 'menor' | 'nome'

export default function Busca() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const categoria = params.get('cat') ?? 'todas'
  const ordem = (params.get('ordem') as Ordem | null) ?? 'relevancia'

  // atualiza só um parâmetro e mantém o resto na URL (dá pra compartilhar a busca)
  function mudar(chave: string, valor: string, padrao: string) {
    const novo = new URLSearchParams(params)
    if (valor === padrao) novo.delete(chave)
    else novo.set(chave, valor)
    setParams(novo, { replace: true })
  }

  // todas as palavras precisam aparecer (em qualquer ordem)
  const palavras = semAcento(q.trim()).split(/\s+/).filter(Boolean)
  const achados = products.filter((p) => {
    const texto = semAcento(`${p.name} ${p.brand} ${p.ean ?? ''}`)
    return palavras.every((w) => texto.includes(w))
  })

  const filtrados = (categoria === 'todas' ? achados : achados.filter((p) => p.categoryId === categoria)).map(
    (p) => ({ produto: p, menor: precosDoProduto(p.id)[0]?.price ?? null }),
  )
  // produtos sem preço sempre vão pro fim da lista
  filtrados.sort((a, b) => {
    if ((a.menor === null) !== (b.menor === null)) return a.menor === null ? 1 : -1
    if (ordem === 'menor') return (a.menor ?? 0) - (b.menor ?? 0)
    if (ordem === 'nome') return a.produto.name.localeCompare(b.produto.name, 'pt-BR')
    return 0
  })
  const catsDoResultado = [...new Set(achados.map((p) => p.categoryId))]

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">
        {q ? `Resultados pra "${q}"` : 'Todos os produtos'}
      </h1>
      <p className="text-sm text-gray-500">{achados.length} produtos encontrados</p>

      <div className="flex items-center gap-2 text-sm text-gray-500">
        <label htmlFor="ordem">ordenar por</label>
        <select
          id="ordem"
          value={ordem}
          onChange={(e) => mudar('ordem', e.target.value, 'relevancia')}
          className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm"
        >
          <option value="relevancia">relevância</option>
          <option value="menor">menor preço</option>
          <option value="nome">nome (A-Z)</option>
        </select>
      </div>

      <div className="flex flex-wrap gap-2">
        <Chip onClick={() => mudar('cat', 'todas', 'todas')} ativo={categoria === 'todas'}>
          todas ({achados.length})
        </Chip>
        {catsDoResultado.map((id) => {
          const cat = categories.find((c) => c.id === id)
          if (!cat) return null
          const qtd = achados.filter((p) => p.categoryId === id).length
          return (
            <Chip key={id} onClick={() => mudar('cat', id, 'todas')} ativo={categoria === id}>
              {cat.name} ({qtd})
            </Chip>
          )
        })}
      </div>

      {filtrados.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
          <p className="text-sm text-gray-500">Nada encontrado. Tenta buscar algo tipo "arroz" ou "leite".</p>
          <Link to="/categorias" className="mt-3 inline-block text-sm font-semibold text-marca-700 hover:underline">
            ver categorias
          </Link>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {filtrados.map(({ produto }) => (
            <ProductCard key={produto.id} produto={produto} />
          ))}
        </div>
      )}
    </div>
  )
}
