import {
  Body,
  Container,
  Head,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
  Tailwind,
  Row,
  Column,
} from '@react-email/components';
import * as React from 'react';

const LOGO_URL = 'https://everestmotoring.co.za/images/logo.png';

const brandConfig = {
  theme: {
    extend: {
      colors: {
        primary: '#ffff01',
        'primary-dark': '#e6e600',
        secondary: '#000000',
      },
    },
  },
};

// The admin edits the message as plain text in the popup. Split on blank lines
// into paragraphs; single newlines inside a paragraph are preserved.
export const TradeInOfferEmail = ({ body = '' }) => {
  const paragraphs = String(body).trim().split(/\n\s*\n/);

  return (
    <Html>
      <Tailwind config={brandConfig}>
        <Head />
        <Preview>Your trade-in offer from Everest Motoring</Preview>
        <Body className="bg-neutral-100 font-sans" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
          <Container width="600" className="mx-auto my-10 w-[600px] max-w-full bg-white border border-neutral-200 rounded-2xl overflow-hidden">
            {/* Header / Logo */}
            <Section>
              <Row>
                <Column className="bg-secondary py-[32px] text-center border-b-4 border-primary">
                  <Img src={LOGO_URL} width="170" height="auto" alt="Everest Motoring" className="mx-auto" align="center" />
                  <Text className="text-primary text-xs font-bold uppercase tracking-[0.2em] mt-3 m-0">
                    Trade-In Offer
                  </Text>
                </Column>
              </Row>
            </Section>

            {/* Body (admin-edited) */}
            <Section>
              <Row>
                <Column className="px-[40px] py-[40px]">
                  {paragraphs.map((p, i) => (
                    <Text
                      key={i}
                      className="text-neutral-700 text-[15px] leading-relaxed m-0 mb-4"
                      style={{ whiteSpace: 'pre-line' }}
                    >
                      {p}
                    </Text>
                  ))}
                </Column>
              </Row>
            </Section>

            {/* Footer */}
            <Section>
              <Row>
                <Column className="bg-secondary py-[32px] px-[32px] text-center">
                  <Text className="text-primary font-bold text-sm m-0 mb-1">EVEREST MOTORING</Text>
                  <Text className="text-neutral-400 text-sm m-0">White River, Mpumalanga</Text>
                  <Text className="text-neutral-400 text-sm m-0 mt-2">013 854 0600 • info@everestmotoring.co.za</Text>
                  <Text className="text-neutral-400 text-sm m-0">everestmotoring.co.za</Text>
                  <Text className="text-neutral-500 text-xs mt-4 m-0">
                    You are receiving this because you requested a vehicle valuation from us.
                    <br />
                    <Link href="#" className="text-primary underline">Unsubscribe</Link>
                  </Text>
                </Column>
              </Row>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default TradeInOfferEmail;
