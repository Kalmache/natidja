// ============================================================================
// src/i18n/index.jsx – gestion des langues ("i18n" = internationalisation)
// ----------------------------------------------------------------------------
// Fonctionnement : on place la langue courante dans un "contexte" React.
// N'importe quel composant peut alors appeler  const { t } = useI18n()  puis
// t('hero.title') pour obtenir le texte dans la bonne langue.
// ============================================================================
import { createContext, useContext, useMemo } from 'react'
import fr from './fr.js'
import ar from './ar.js'

export const LANGS = {
  fr: { label: 'Français', short: 'FR', dir: 'ltr', dict: fr },
  ar: { label: 'العربية', short: 'ع', dir: 'rtl', dict: ar },
}

const I18nContext = createContext(null)

export function I18nProvider({ lang, children }) {
  const value = useMemo(() => {
    const dict = LANGS[lang]?.dict ?? fr
    // t('cle', { n: 3 }) → texte dans la langue courante.
    // Si la clé manque, on retombe sur le français, puis sur la clé elle-même.
    const t = (cle, vars = {}) => {
      const brut = dict[cle] ?? fr[cle] ?? cle
      if (typeof brut !== 'string') return brut // listes (ex. étapes "Comment ça marche")
      // Remplace chaque {variable} par sa valeur.
      return brut.replace(/\{(\w+)\}/g, (_, nom) => vars[nom] ?? `{${nom}}`)
    }
    return { t, lang, dir: LANGS[lang]?.dir ?? 'ltr' }
  }, [lang])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export const useI18n = () => useContext(I18nContext)
