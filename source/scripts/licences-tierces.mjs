// ============================================================================
// scripts/licences-tierces.mjs – génère public/licences-tierces.txt
// ----------------------------------------------------------------------------
// Les composants libres utilisés par le site (licence MIT) exigent que leurs
// mentions de droits d'auteur accompagnent toute copie distribuée. Ce script
// recopie leurs vrais textes de licence dans UN fichier de notices, publié avec
// le site et embarqué dans l'application Android. C'est la pratique courante :
// les notices sont fournies, sans encombrer les pages du site.
// Si une licence est introuvable, la construction ÉCHOUE (conformité garantie).
// ============================================================================
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const SOURCE = fileURLToPath(new URL('..', import.meta.url))
// Composants dont du code se retrouve dans le site ou l'application.
const PAQUETS = [
  'react', 'react-dom', 'scheduler', 'qrcode-generator', 'vite',
  'workbox-core', 'workbox-routing', 'workbox-strategies', 'workbox-precaching',
  'workbox-expiration', 'workbox-cacheable-response',
  '@capacitor/core', '@capacitor/android',
]

// qrcode-generator (MIT, Kazuhiko Arase) ne fournit pas de fichier LICENSE :
// on utilise le texte MIT standard avec le copyright déclaré dans son package.json.
const MIT = (auteur) => `MIT License

Copyright (c) ${auteur}

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.`

const groupes = new Map() // texte de licence -> [ "paquet version" ]
for (const nom of PAQUETS) {
  const dossier = join(SOURCE, 'node_modules', nom)
  if (!existsSync(dossier)) throw new Error(`Composant introuvable : ${nom} (npm install ?)`)
  const pkg = JSON.parse(readFileSync(join(dossier, 'package.json'), 'utf8'))
  const fichier = readdirSync(dossier).find((f) => /^licen[cs]e(\.md|\.txt)?$/i.test(f))
  let texte
  if (fichier) {
    texte = readFileSync(join(dossier, fichier), 'utf8').trim()
    // Le fichier de Vite liste aussi les licences de ses outils de construction, qui ne sont
    // PAS livrés avec le site : on ne garde que la licence du code de Vite lui-même.
    const coupe = texte.indexOf('# Licenses of bundled dependencies')
    if (coupe > 0) texte = texte.slice(0, coupe).trim()
  }
  else if (pkg.license === 'MIT' && pkg.author) texte = MIT(typeof pkg.author === 'string' ? pkg.author : pkg.author.name)
  else throw new Error(`Licence introuvable pour ${nom} : ajoutez-la manuellement.`)
  groupes.set(texte, [...(groupes.get(texte) ?? []), `${nom} ${pkg.version}`])
}

const entete = `NDEZE NATIDJA — NOTICES DES COMPOSANTS TIERS
=============================================

Ce site et son application utilisent les composants logiciels libres listés
ci-dessous. Leurs mentions de droits d'auteur et leurs licences sont reproduites
ici, conformément à leurs conditions d'utilisation. Ces composants restent la
propriété de leurs auteurs respectifs.
`
const corps = [...groupes].map(([texte, noms]) => `\n-------------------------------------------------------------\n${noms.join('\n')}\n-------------------------------------------------------------\n\n${texte}\n`)
writeFileSync(join(SOURCE, 'public', 'licences-tierces.txt'), entete + corps.join(''), 'utf8')
console.log(`✔ licences-tierces.txt : ${PAQUETS.length} composants, ${groupes.size} textes de licence`)
