// Nomes de produto chegam dos mercados com aspas duplicadas, espacos sobrando e acentos.

export const semAcento = (texto) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export const limparNome = (nome) =>
  nome
    .replace(/'{2,}|"{2,}/g, '')
    .replace(/\s+/g, ' ')
    .trim()

export const slug = (texto) =>
  semAcento(texto)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
