/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Img,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Confirme ton email pour {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src="https://mbloebaovvvgfwxsdzgo.supabase.co/storage/v1/object/public/email-assets/cocoricoach-logo.png" alt="CocoriCoach Club" width="160" style={logo} />
        <Heading style={h1}>Bienvenue dans l'équipe !</Heading>
        <Text style={text}>
          Merci de t'être inscrit sur{' '}
          <Link href={siteUrl} style={link}>
            <strong>{siteName}</strong>
          </Link>
          .
        </Text>
        <Text style={text}>
          Confirme ton adresse email ({recipient}) en cliquant sur le bouton ci-dessous pour activer ton compte :
        </Text>
        <Button style={button} href={confirmationUrl}>
          Confirmer mon email
        </Button>
        <Text style={footer}>
          Si tu n'as pas créé de compte, tu peux ignorer cet email en toute sécurité.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const logo = { margin: "0 0 24px", display: "block" }
const _brand = {
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
const link = { color: '#17A2B8', textDecoration: 'underline' }
const button = {
  backgroundColor: '#0B1F3A',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 'bold' as const,
  borderRadius: '12px',
  padding: '14px 24px',
  textDecoration: 'none',
  display: 'inline-block',
  margin: '8px 0 16px',
}
const footer = { fontSize: '12px', color: '#6B7280', margin: '32px 0 0', lineHeight: '1.5' }
