import { Resend } from 'resend';

let _resend = null;
function getResend() {
  if (_resend) return _resend;
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  _resend = new Resend(key);
  return _resend;
}

const FROM_ADDRESS =
  process.env.RESEND_FROM_EMAIL || 'Everest Motoring <onboarding@resend.dev>';

const DEFAULT_REPLY_TO = process.env.RESEND_REPLY_TO || null;

export const sendEmail = async ({ to, subject, react, scheduledAt, replyTo }) => {
  const resend = getResend();
  if (!resend) {
    console.warn('sendEmail skipped: RESEND_API_KEY is not set');
    return { success: false, error: { message: 'RESEND_API_KEY not configured' } };
  }
  try {
    const payload = { from: FROM_ADDRESS, to, subject, react };
    if (scheduledAt) payload.scheduledAt = scheduledAt;

    const finalReplyTo = replyTo || DEFAULT_REPLY_TO;
    if (finalReplyTo) payload.replyTo = finalReplyTo;

    const { data, error } = await resend.emails.send(payload);

    if (error) {
      console.error('Error sending email:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (err) {
    console.error('Unexpected error sending email:', err);
    return { success: false, error: err };
  }
};

export default getResend;
