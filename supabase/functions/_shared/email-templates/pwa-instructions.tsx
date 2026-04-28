/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import { Heading, Section, Text } from 'npm:@react-email/components@0.0.22'

export const PwaInstructions = () => (
  <Section style={section}>
    <Heading as="h2" style={h2}>📱 Installe l'application sur ton téléphone</Heading>
    <Text style={text}>
      Pour profiter de toutes les fonctionnalités (notifications push, accès rapide, mode plein écran),
      installe CocoriCoach Club sur ton téléphone en quelques secondes.
    </Text>

    <Text style={subTitle}>🤖 Sur Android (Chrome)</Text>
    <Text style={listText}>
      1. Ouvre <strong>cocoricoachclub.com</strong> dans Chrome<br />
      2. Appuie sur le menu <strong>⋮</strong> (en haut à droite)<br />
      3. Sélectionne <strong>« Ajouter à l'écran d'accueil »</strong> ou <strong>« Installer l'application »</strong><br />
      4. Confirme l'installation
    </Text>

    <Text style={subTitle}>🍎 Sur iPhone / iPad (Safari)</Text>
    <Text style={listText}>
      1. Ouvre <strong>cocoricoachclub.com</strong> dans <strong>Safari</strong> (obligatoire)<br />
      2. Appuie sur l'icône <strong>Partager</strong> ⬆️ (en bas de l'écran)<br />
      3. Fais défiler et sélectionne <strong>« Sur l'écran d'accueil »</strong><br />
      4. Appuie sur <strong>« Ajouter »</strong> en haut à droite
    </Text>

    <Section style={highlight}>
      <Text style={highlightText}>
        🔔 <strong>Étape essentielle :</strong> à ta première connexion depuis l'app installée,
        accepte les <strong>notifications</strong> quand le téléphone te le demande.
        C'est ce qui te permettra de recevoir les rappels (séances, wellness, RPE, convocations, alertes santé...).
      </Text>
    </Section>
  </Section>
)

const section = { margin: '24px 0', padding: '20px', backgroundColor: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0' }
const h2 = { fontSize: '18px', fontWeight: 'bold' as const, color: '#0B1F3A', margin: '0 0 12px' }
const text = { fontSize: '14px', color: '#1F2933', lineHeight: '1.6', margin: '0 0 16px' }
const subTitle = { fontSize: '15px', fontWeight: 'bold' as const, color: '#0B1F3A', margin: '16px 0 8px' }
const listText = { fontSize: '14px', color: '#1F2933', lineHeight: '1.8', margin: '0 0 8px' }
const highlight = { marginTop: '16px', padding: '14px', backgroundColor: '#FEF3C7', borderRadius: '10px', border: '1px solid #FCD34D' }
const highlightText = { fontSize: '14px', color: '#78350F', lineHeight: '1.6', margin: 0 }
