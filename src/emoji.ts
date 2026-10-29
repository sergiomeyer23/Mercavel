// Ícone de comida do produto: sai de palavras do nome e da subcategoria, porque são milhares de itens.
const porPalavra: [RegExp, string][] = [
  [/arroz/, '🍚'],
  [/feij[aã]o/, '🫘'],
  [/caf[eé]|c[aá]psula/, '☕'],
  [/\bch[aá]\b|erva.?mate/, '🍵'],
  [/leite/, '🥛'],
  [/queijo|mussarela|requeij/, '🧀'],
  [/iogurte|coalhada/, '🥣'],
  [/manteiga|margarina/, '🧈'],
  [/\bovos?\b/, '🥚'],
  [/p[aã]o|torrada|bisnaguinha/, '🍞'],
  [/bolo|panetone/, '🍰'],
  [/biscoito|bolacha|cookie/, '🍪'],
  [/chocolate|bombom|\bbala\b|balas|doce|sobremesa|gelatina/, '🍫'],
  [/macarr|massa|espaguete|lasanha|miojo/, '🍝'],
  [/molho|extrato|tomate/, '🍅'],
  [/azeite|[oó]leo/, '🫒'],
  [/a[cç][uú]car|ado[cç]ante/, '🍬'],
  [/farinha|fub[aá]|aveia|cereal|granola/, '🌾'],
  [/milho|pipoca/, '🌽'],
  [/atum|sardinha|peixe|camar|til[aá]pia/, '🐟'],
  [/carne|bife|cox[aã]o|picanha|alcatra|costela|su[ií]n|bovin|maminha/, '🥩'],
  [/frango|coxa|peito|sobrecoxa/, '🍗'],
  [/lingui[cç]a|salsicha|presunto|mortadela|bacon|salame/, '🌭'],
  [/refrigerante|refri\b|energ[eé]tico|isot[oô]nico/, '🥤'],
  [/suco|n[eé]ctar/, '🧃'],
  [/[aá]gua/, '💧'],
  [/cerveja|chopp/, '🍺'],
  [/vinho|espumante|champanhe/, '🍷'],
  [/whisky|vodka|\bgin\b|cacha[cç]a|licor|destilad/, '🥃'],
  [/banana/, '🍌'],
  [/ma[cç][aã]/, '🍎'],
  [/laranja|lim[aã]o|tangerina|bergamota/, '🍊'],
  [/\buva/, '🍇'],
  [/batata/, '🥔'],
  [/cebola/, '🧅'],
  [/\balho\b/, '🧄'],
  [/cenoura/, '🥕'],
  [/alface|couve|verdura|salada|r[uú]cula/, '🥬'],
  [/pizza/, '🍕'],
  [/sorvete|picol[eé]|gelado/, '🍨'],
  [/hamb[uú]rguer/, '🍔'],
  [/detergente|esponja|lava.?lou[cç]a/, '🧽'],
  [/sab[aã]o|sabonete/, '🧼'],
  [/amaciante|lava.?roupas|alvejante|roupas/, '🧺'],
  [/desinfetante|limpador|multiuso|[aá]gua sanit/, '🧹'],
  [/papel higi|papel toalha|guardanapo/, '🧻'],
  [/shampoo|condicionador|hidratante|creme para/, '🧴'],
  [/dental|escova|enxaguante|fio dental/, '🪥'],
  [/fralda|absorvente/, '👶'],
  [/ra[cç][aã]o.*(c[aã]o|c[aã]es|cachorro|dog)|\bdog\b/, '🐶'],
  [/ra[cç][aã]o.*(gato|cat)|\bcat\b/, '🐱'],
  [/pilha|bateria/, '🔋'],
  [/\bvelas?\b/, '🕯️'],
]

const porCategoria: Record<string, string> = {
  'cat-mercearia': '🛒',
  'cat-carnes': '🥩',
  'cat-bebidas': '🥤',
  'cat-laticinios': '🧀',
  'cat-hortifruti': '🥬',
  'cat-higiene': '🧼',
  'cat-limpeza': '🧽',
  'cat-padaria': '🥖',
  'cat-congelados': '🍦',
  'cat-alimentos': '🍽️',
  'cat-pet': '🐾',
  'cat-outros': '🛍️',
}

export function emojiDoProduto(nome: string, subcategoria: string | null | undefined, categoriaId: string) {
  const texto = `${nome} ${subcategoria ?? ''}`.toLowerCase()
  for (const [regra, emoji] of porPalavra) if (regra.test(texto)) return emoji
  return emojiDaCategoria(categoriaId)
}

export function emojiDaCategoria(categoriaId: string) {
  return porCategoria[categoriaId] ?? '🛒'
}
