// Pont vers l'impression native d'Android (application Capacitor).
// Déclaré UNE seule fois ici : Capacitor refuse d'enregistrer deux fois le même module.
import { registerPlugin } from '@capacitor/core'

export const ImpressionNative = registerPlugin('ImpressionNative')
