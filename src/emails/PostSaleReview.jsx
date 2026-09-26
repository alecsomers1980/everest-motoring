import {
  Html,
  Tailwind,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Row,
  Column,
  Img,
  Link,
  Button,
  Text,
  Heading,
} from '@react-email/components';
import * as React from 'react';

const LOGO_URL = 'https://everestmotoring.co.za/images/logo.png';
const FACEBOOK_URL = 'https://facebook.com/everestmotoring';

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

export const PostSaleReviewEmail = ({
  customerName = 'Valued Client',
  vehicleModel = 'your new vehicle',
  carImageUrl = 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=800',
  deliveryPhotoUrl = null,
  videoUrl = 'https://everestmotoring.co.za/media/celebration',
  reviewUrl = 'https://www.google.com/search?q=Everest+Motoring',
  // When false, this sale was not posted to social — so don't invite the
  // customer to find their video on Facebook (it isn't there).
  postedToSocial = true,
}) => {
  const videoThumb = deliveryPhotoUrl || carImageUrl;

  return (
    <Html>
      <Tailwind config={brandConfig}>
        <Head />
        <Preview>Congratulations on your {vehicleModel}!</Preview>
        <Body className="bg-neutral-100 font-sans" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
          <Container
            width="600"
            className="mx-auto my-10 w-[600px] max-w-full bg-white border border-neutral-200 rounded-2xl overflow-hidden"
          >
            {/* A) Header band */}
            <Section>
              <Row>
                <Column className="bg-secondary px-[32px] py-[32px] text-center border-b-4 border-primary">
                  <Img
                    src={LOGO_URL}
                    width="170"
                    alt="Everest Motoring"
                    align="center"
                    className="mx-auto"
                  />
                </Column>
              </Row>
            </Section>

            {/* B) Intro */}
            <Section>
              <Row>
                <Column className="px-[40px] pt-[40px] pb-[24px] text-center">
                  <Heading className="text-3xl font-bold text-neutral-900 m-0 mb-4">
                    Congratulations on your new ride!
                  </Heading>
                  <Text className="text-neutral-600 text-lg leading-relaxed m-0">
                    Hi {customerName}, we hope your <strong>{vehicleModel}</strong> has been
                    everything you were hoping for.
                  </Text>
                </Column>
              </Row>
            </Section>

            {/* C) Inventory car image */}
            {carImageUrl && (
              <Section>
                <Row>
                  <Column className="px-[40px] pb-[24px]">
                    <Img
                      src={carImageUrl}
                      width="520"
                      align="center"
                      alt={vehicleModel}
                      className="rounded-xl w-full h-auto mx-auto"
                    />
                  </Column>
                </Row>
              </Section>
            )}

            {/* D) Celebration video block */}
            {videoUrl && (
              <Section>
                <Row>
                  <Column className="px-[40px] pb-[8px] text-center">
                    <Text className="text-neutral-500 font-bold text-xs uppercase tracking-[0.2em] m-0 mb-3">
                      🎉 Your Everest Celebration Video
                    </Text>

                    <Link href={videoUrl}>
                      <Img
                        src={videoThumb}
                        width="520"
                        align="center"
                        alt="Watch your celebration video"
                        className="rounded-xl w-full h-auto mx-auto border border-neutral-200"
                      />
                    </Link>

                    <Section className="text-center">
                      <Row>
                        <Column className="pt-[16px] text-center">
                          <Button
                            className="bg-primary text-black font-bold py-[14px] px-[28px] rounded-lg"
                            href={videoUrl}
                          >
                            ▶  Watch / Download Video
                          </Button>
                        </Column>
                      </Row>
                    </Section>

                    <Text className="text-neutral-600 text-sm leading-relaxed mt-[16px] m-0">
                      {postedToSocial
                        ? 'Download the video to keep and share it with friends and family — or watch it on our Facebook page and share it directly from there.'
                        : 'Download the video to keep and share it with friends and family.'}
                    </Text>

                    {postedToSocial && (
                      <Text className="mt-[8px] m-0">
                        <Link href={FACEBOOK_URL} className="text-black font-bold underline">
                          View on our Facebook page
                        </Link>
                      </Text>
                    )}
                  </Column>
                </Row>
              </Section>
            )}

            {/* E) Review request */}
            <Section>
              <Row>
                <Column className="px-[40px] pt-[24px] pb-[8px] text-center">
                  <Text className="text-neutral-600 text-lg leading-relaxed mb-6">
                    If you have a moment, we'd really appreciate hearing about your experience.
                    Honest reviews from clients like you help others trust us with their next
                    vehicle.
                  </Text>

                  <Section>
                    <Row>
                      <Column className="text-center pb-[8px]">
                        <Button
                          className="bg-primary text-black font-bold py-[16px] px-[32px] rounded-lg"
                          href={reviewUrl}
                        >
                          Leave a Google Review
                        </Button>
                      </Column>
                    </Row>
                  </Section>

                  <Text className="text-neutral-500 italic text-sm m-0">
                    Thank you for choosing Everest Motoring.
                  </Text>
                </Column>
              </Row>
            </Section>

            {/* F) Footer band */}
            <Section>
              <Row>
                <Column className="bg-secondary px-[32px] py-[32px] text-center">
                  <Text className="text-primary font-bold text-sm m-0 mb-1">EVEREST MOTORING</Text>
                  <Text className="text-neutral-400 text-sm m-0">White River, Mpumalanga</Text>
                  <Text className="text-neutral-400 text-sm m-0 mt-2">
                    013 854 0600 • info@everestmotoring.co.za
                  </Text>
                  <Text className="text-neutral-400 text-sm m-0">everestmotoring.co.za</Text>
                  <Text className="text-neutral-500 text-xs mt-4 m-0">
                    You are receiving this because you recently purchased a vehicle from us.
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

export default PostSaleReviewEmail;
