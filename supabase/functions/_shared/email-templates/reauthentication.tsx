/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Ton code de vérification CocoriCoach Club</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={brand}>🐓 CocoriCoach Club</Heading>
        <Heading style={h1}>Confirme ton identité</Heading>
        <Text style={text}>Utilise le code ci-dessous pour confirmer ton identité :</Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={footer}>
          Ce code expirera prochainement. Si tu n'as pas demandé cette vérification, ignore cet email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const brand = {
  fontSize: '14px',
  fontWeight: 'bold' as const,
  color: '#0B1F3A',
  letterSpacing: '0.5px',
  margin: '0 0 24px',
  textTransform: 'uppercase' as const,
}
const h1 = {
  fontSize: '24px',
  fontWeight: 'bold' as const,
  color: '#0B1F3A',
  margin: '0 0 20px',
}
const text = {
  fontSize: '15px',
  color: '#1F2933',
  lineHeight: '1.6',
  margin: '0 0 20px',
}
const codeStyle = {
  fontFamily: 'Courier, monospace',
  fontSize: '32px',
  fontWeight: 'bold' as const,
  color: '#0B1F3A',
  letterSpacing: '6px',
  backgroundColor: '#F5F7FA',
  padding: '20px',
  borderRadius: '12px',
  textAlign: 'center' as const,
  margin: '0 0 30px',
}
const footer = { fontSize: '12px', color: '#6B7280', margin: '32px 0 0', lineHeight: '1.5' }
