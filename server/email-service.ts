import sgMail from '@sendgrid/mail';

// Initialize SendGrid if API key is available
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  try {
    if (!process.env.SENDGRID_API_KEY) {
      console.warn('SendGrid API key not configured, cannot send email');
      return false;
    }

    await sgMail.send({
      to: params.to,
      from: params.from,
      subject: params.subject,
      text: params.text,
      html: params.html,
    });

    console.log('Email sent successfully to:', params.to);
    return true;
  } catch (error) {
    console.error('SendGrid email error:', error);
    return false;
  }
}

export async function sendCheckInEmail(
  clientEmail: string,
  subject: string,
  message: string,
  therapistEmail?: string
): Promise<boolean> {
  const fromEmail = therapistEmail || 'therapy@example.com';
  const htmlMessage = message.replace(/\n/g, '<br>');
  
  return sendEmail({
    to: clientEmail,
    from: fromEmail,
    subject: subject,
    text: message,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
          ${htmlMessage}
        </div>
        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e9ecef; font-size: 12px; color: #6c757d;">
          <p>This message was sent from your therapy practice management system.</p>
          <p>If you have any concerns, please contact your therapist directly.</p>
        </div>
      </div>
    `
  });
}