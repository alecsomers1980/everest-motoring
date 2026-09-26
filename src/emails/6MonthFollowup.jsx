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

export const SixMonthFollowupEmail = ({
  customerName = 'Valued Client',
  vehicleModel = 'Toyota Fortuner',
  carImageUrl = 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=800',
}) => {
  return (
    <Html>
      <Tailwind config={brandConfig}>
        <Head />
        <Preview>Six months with your {vehicleModel} — how is it going?</Preview>
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

            <Section>
              <Row>
                <Column className="px-[40px] pt-[40px] pb-[24px] text-center">
                  <Heading className="text-3xl font-bold text-neutral-900 m-0 mb-4">
                    Six Months of Excellence
                  </Heading>
                  <Text className="text-neutral-600 text-lg leading-relaxed m-0 mb-2">
                    Hi {customerName}, it's been six months since you drove away in your{' '}
                    <strong>{vehicleModel}</strong>.
                  </Text>
                  <Text className="text-neutral-600 text-lg leading-relaxed m-0">
                    We hope you're loving every kilometre. How has your experience with Everest Motoring
                    been so far?
                  </Text>
                </Column>
              </Row>
            </Section>

            {/* Inventory car image */}
            {carImageUrl && (
              <Section>
                <Row>
                  <Column className="px-[40px] pb-[24px]">
                    <Img
                      src={carImageUrl}
                      width="520"
                      height="auto"
                      alt={vehicleModel}
                      align="center"
                      className="rounded-xl object-cover w-full h-auto mx-auto"
                    />
                  </Column>
                </Row>
              </Section>
            )}

            {/* Rating */}
            <Section>
              <Row>
                <Column className="px-[40px] pb-[32px]">
                  <Section>
                    <Row>
                      <Column className="bg-neutral-50 border border-neutral-200 rounded-xl py-[32px] text-center">
                        <Text className="font-bold text-neutral-900 uppercase tracking-wider m-0 mb-3">
                          Rate Your Experience
                        </Text>
                        <Text className="text-3xl text-primary-dark m-0">★ ★ ★ ★ ★</Text>
                      </Column>
                    </Row>
                  </Section>
                </Column>
              </Row>
            </Section>

            <Section>
              <Row>
                <Column className="px-[40px] pb-[40px] text-center">
                  <Text className="text-neutral-500 italic text-sm m-0">
                    Share a photo of your ride and tag us to be featured on our social media!
                  </Text>
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

export default SixMonthFollowupEmail;
