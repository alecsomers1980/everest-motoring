import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
  Tailwind,
  Button,
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

export const WelcomeEmail = ({
  customerName = 'Valued Customer',
}) => {
  return (
    <Html>
      <Tailwind config={brandConfig}>
        <Head />
        <Preview>Welcome to the Everest Motoring Family</Preview>
        <Body className="bg-neutral-100 font-sans" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
          <Container width="600" className="mx-auto my-10 w-[600px] max-w-full bg-white border border-neutral-200 rounded-2xl overflow-hidden">
            {/* Header / Logo */}
            <Section>
              <Row>
                <Column className="bg-secondary py-[32px] text-center border-b-4 border-primary">
                  <Img src={LOGO_URL} width="170" height="auto" alt="Everest Motoring" className="mx-auto" align="center" />
                </Column>
              </Row>
            </Section>

            {/* Content */}
            <Section>
              <Row>
                <Column className="px-[40px] py-[40px] text-center">
                  <Heading className="text-3xl font-bold text-neutral-900 m-0 mb-6">
                    Welcome to the Family, {customerName}!
                  </Heading>
                  <Text className="text-neutral-600 text-lg leading-relaxed mb-8">
                    Thank you for choosing Everest Motoring. We're honoured to help you find your next
                    premium vehicle, and to give you a seamless, transparent buying experience from start
                    to finish.
                  </Text>

                  <Section>
                    <Row>
                      <Column className="bg-neutral-50 border border-neutral-200 p-[24px] rounded-xl mb-8 text-left">
                        <Text className="font-bold text-neutral-900 m-0 mb-2">✅ Premium inspection on every vehicle</Text>
                        <Text className="font-bold text-neutral-900 m-0 mb-2">✅ Transparent finance options</Text>
                        <Text className="font-bold text-neutral-900 m-0">✅ AI-driven digital showroom</Text>
                      </Column>
                    </Row>
                  </Section>

                  <Section>
                    <Row>
                      <Column className="text-center">
                        <Button
                          className="bg-primary text-black font-bold py-[16px] px-[32px] rounded-lg"
                          href="https://everestmotoring.co.za/inventory"
                        >
                          Browse Our Showroom
                        </Button>
                      </Column>
                    </Row>
                  </Section>
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
                    You are receiving this because you subscribed to our communications.
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

export default WelcomeEmail;
