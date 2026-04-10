import nodemailer from 'nodemailer';

// Create transporter
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: process.env.SMTP_PORT === '465', // true for 465, false for 587
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
    },
});

// Send registration confirmation email
export const sendRegistrationConfirmationEmail = async (email, userName, eventName, registrationId) => {
    try {
        const mailOptions = {
            from: `"${process.env.SENDER_NAME}" <${process.env.SENDER_EMAIL}>`,
            to: email,
            subject: `Registration Confirmed: ${eventName}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                        <h1 style="color: white; margin: 0;">Registration Confirmed!</h1>
                    </div>
                    <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
                        <p>Hi <strong>${userName}</strong>,</p>
                        <p>Thank you for registering for <strong>${eventName}</strong>. We're excited to have you!</p>
                        
                        <div style="background: white; border: 2px solid #667eea; padding: 20px; margin: 20px 0; border-radius: 8px;">
                            <p style="margin: 0 0 10px 0; color: #666;">Your Ticket ID (for check-in):</p>
                            <p style="margin: 0; font-family: 'Courier New', monospace; font-size: 18px; font-weight: bold; color: #667eea; word-break: break-all;">
                                ${registrationId}
                            </p>
                            <p style="margin: 10px 0 0 0; font-size: 12px; color: #999;">Save this ID for check-in at the event</p>
                        </div>

                        <h3 style="color: #333;">What's Next?</h3>
                        <ul style="color: #666;">
                            <li>Save your Ticket ID for easy check-in</li>
                            <li>Check your dashboard for event details and updates</li>
                            <li>Arrive 15 minutes early on event day</li>
                        </ul>

                        <p style="color: #666; margin-top: 30px;">If you have any questions, please don't hesitate to reach out.</p>
                        
                        <div style="border-top: 1px solid #ddd; margin-top: 30px; padding-top: 20px; text-align: center; color: #999; font-size: 12px;">
                            <p>© ${new Date().getFullYear()} EventHub. All rights reserved.</p>
                        </div>
                    </div>
                </div>
            `,
        };

        await transporter.sendMail(mailOptions);
        console.log(`✉️ Registration confirmation email sent to ${email}`);
        return true;
    } catch (error) {
        console.error(`❌ Error sending registration email to ${email}:`, error);
        return false;
    }
};

// Send check-in confirmation email
export const sendCheckInConfirmationEmail = async (email, userName, eventName) => {
    try {
        const mailOptions = {
            from: `"${process.env.SENDER_NAME}" <${process.env.SENDER_EMAIL}>`,
            to: email,
            subject: `Check-In Confirmed: ${eventName}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                        <h1 style="color: white; margin: 0;">✓ Check-In Successful!</h1>
                    </div>
                    <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
                        <p>Hi <strong>${userName}</strong>,</p>
                        <p>You've successfully checked in to <strong>${eventName}</strong>.</p>
                        <p style="color: #667eea; font-size: 16px; font-weight: bold;">Welcome to the event! 🎉</p>
                        
                        <div style="border-top: 1px solid #ddd; margin-top: 30px; padding-top: 20px; text-align: center; color: #999; font-size: 12px;">
                            <p>© ${new Date().getFullYear()} EventHub. All rights reserved.</p>
                        </div>
                    </div>
                </div>
            `,
        };

        await transporter.sendMail(mailOptions);
        console.log(`✉️ Check-in confirmation email sent to ${email}`);
        return true;
    } catch (error) {
        console.error(`❌ Error sending check-in email to ${email}:`, error);
        return false;
    }
};

export default { sendRegistrationConfirmationEmail, sendCheckInConfirmationEmail };
