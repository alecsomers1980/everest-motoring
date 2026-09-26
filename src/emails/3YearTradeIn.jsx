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
  Row,
  Column,
  Button,
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

export const ThreeYearTradeInEmail = ({
  customerName = 'Valued Client',
  oldVehicle = '2021 Toyota Hilux',
  estimatedValue = 'R 485,000',
}) => {
  return (
    <Html>
      <Tailwind config={brandConfig}>
        <Head />
        <Preview>An exclusive upgrade offer for your {oldVehicle}</Preview>
        <Body className="bg-neutral-100 font-sans" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
          <Container width="600" className="mx-auto my-10 w-[600px] max-w-full bg-white border border-neutral-200 rounded-2xl overflow-hidden">
            {/* Header / Logo */}
            <Section>
              <Row>
                <Column className="bg-secondary py-[32px] text-center border-b-4 border-primary">
                  <Img src={LOGO_URL} width="170" height="auto" alt="Everest Motoring" className="mx-auto" align="center" />
                  <Text className="text-primary text-xs font-bold uppercase tracking-[0.3em] mt-3 m-0">
                    Executive Upgrade Program
                  </Text>
                </Column>
              </Row>
            </Section>

            <Section>
              <Row>
                <Column className="px-[40px] pt-[40px] pb-[24px]">
                  <Heading className="text-2xl font-bold text-neutral-900 m-0 mb-4">
                    Your {oldVehicle} is in High Demand
                  </Heading>
                  <Text className="text-neutral-600 text-lg leading-relaxed m-0">
                    Hi {customerName}, it's been 3 years since you joined the Everest family. Based on
                    current market trends, your vehicle has an{' '}
                    <strong>exceptional trade-in value</strong> right now.
                  </Text>
                </Column>
              </Row>
            </Section>

            {/* Valuation Card */}
            <Section>
              <Row>
                <Column className="px-[40px] pb-[32px]">
                  <Section>
                    <Row>
                      <Column className="bg-secondary rounded-xl py-[32px] text-center border-b-4 border-primary">
                        <Text className="text-neutral-400 text-sm uppercase font-bold m-0 mb-2">
                          Estimated Market Value
                        </Text>
                        <Text className="text-primary text-4xl font-bold m-0">{estimatedValue}</Text>
                      </Column>
                    </Row>
                  </Section>
                </Column>
              </Row>
            </Section>

            {/* Recommended upgrades */}
            <Section>
              <Row>
                <Column className="px-[40px] pb-[24px]">
                  <Heading as="h3" className="text-lg font-bold text-neutral-900 uppercase tracking-wider m-0 mb-4">
                    Recommended Upgrades
                  </Heading>
                  <Row>
                    <Column className="w-1/2 px-2 align-top">
                      <Section>
                        <Row>
                          <Column className="border border-neutral-200 rounded-xl p-[12px] bg-neutral-50">
                            <Img src="https://images.unsplash.com/photo-1621259182978-f09e5e2ca1c5?auto=format&fit=crop&q=80&w=400" width="230" height="auto" alt="2024 Hilux" className="rounded-lg object-cover w-full h-auto mb-2" />
                            <Text className="font-bold text-neutral-900 text-sm m-0">2024 Toyota Hilux</Text>
                          </Column>
                        </Row>
                      </Section>
                    </Column>
                    <Column className="w-1/2 px-2 align-top">
                      <Section>
                        <Row>
                          <Column className="border border-neutral-200 rounded-xl p-[12px] bg-neutral-50">
                            <Img src="https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=400" width="230" height="auto" alt="2024 Fortuner" className="rounded-lg object-cover w-full h-auto mb-2" />
                            <Text className="font-bold text-neutral-900 text-sm m-0">2024 Toyota Fortuner</Text>
                          </Column>
                        </Row>
                      </Section>
                    </Column>
                  </Row>
                </Column>
              </Row>
            </Section>

            <Section>
              <Row>
                <Column className="px-[40px] pb-[40px] text-center">
                  <Button className="bg-primary text-black font-bold py-4 px-8 rounded-lg" href="https://everestmotoring.co.za/value-my-car">
                    Claim Your Free Valuation
                  </Button>
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
                  <Text className="text-neutral-500 text-xs mt-4 m-0 italic">
                    * Valuation is an estimate based on average market condition. Final offer subject to
                    physical inspection.
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

export default ThreeYearTradeInEmail;
