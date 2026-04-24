const nodemailer = require('nodemailer');

// Create transporter based on environment
const createTransporter = async () => {
  // For production, use the configured SMTP
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    console.log('Using SMTP transporter:', process.env.SMTP_HOST);
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  // For development, use ethereal email (test account)
  console.log('No SMTP configured, using Ethereal test account');
  try {
    const testAccount = await nodemailer.createTestAccount();
    console.log('Ethereal test account created:', testAccount.user);
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
  } catch (err) {
    console.error('Failed to create Ethereal test account:', err);
    // Return a dummy transporter that logs but doesn't send
    return {
      sendMail: async (mailOptions) => {
        console.log('Email would be sent (no SMTP configured):', mailOptions);
        return { messageId: 'no-smtp-' + Date.now() };
      }
    };
  }
};

// Initialize transporter lazily
let transporterPromise = null;
const getTransporter = async () => {
  if (!transporterPromise) {
    transporterPromise = createTransporter();
  }
  return transporterPromise;
};

// Email templates
const getEmailTemplate = (type, data) => {
  const templates = {
    welcome: {
      subject: `Welcome to ${data.siteName || 'Blisswell'}!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #2563EB 0%, #10B981 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Welcome to ${data.siteName || 'Blisswell'}!</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; color: #374151;">Hello ${data.name},</p>
            <p style="font-size: 16px; color: #374151;">Thank you for registering with us! Your account has been created successfully.</p>
            <p style="font-size: 16px; color: #374151;">Here are your account details:</p>
            <ul style="color: #4b5563;">
              <li><strong>Email:</strong> ${data.email}</li>
              <li><strong>Referral Code:</strong> ${data.referralCode}</li>
            </ul>
            <p style="font-size: 16px; color: #374151;">You can now login to your account and start exploring our products.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.loginUrl}" style="background: #2563EB; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 600;">Login to Your Account</a>
            </div>
            <p style="font-size: 14px; color: #6b7280;">If you have any questions, feel free to contact our support team.</p>
          </div>
        </div>
      `
    },
    purchase: {
      subject: `Order Confirmation - ${data.siteName || 'Blisswell'}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #2563EB 0%, #10B981 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Order Confirmed!</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; color: #374151;">Hello ${data.name},</p>
            <p style="font-size: 16px; color: #374151;">Thank you for your purchase! Your order has been confirmed.</p>
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #1f2937;">Order Details:</h3>
              <p style="color: #4b5563;"><strong>Product:</strong> ${data.productName}</p>
              <p style="color: #4b5563;"><strong>Amount:</strong> ₹${data.amount?.toLocaleString()}</p>
              <p style="color: #4b5563;"><strong>Order ID:</strong> ${data.orderId}</p>
              <p style="color: #4b5563;"><strong>Date:</strong> ${data.date}</p>
            </div>
            <p style="font-size: 14px; color: #6b7280;">You can view your order details in your dashboard.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.dashboardUrl}" style="background: #10B981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 600;">View Order</a>
            </div>
          </div>
        </div>
      `
    },
    payout: {
      subject: `Salary Payout Received - ${data.siteName || 'Blisswell'}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">💰 Payout Received!</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; color: #374151;">Hello ${data.name},</p>
            <p style="font-size: 16px; color: #374151;">Great news! Your salary payout has been processed.</p>
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
              <p style="font-size: 14px; color: #6b7280; margin: 0;">Amount Credited</p>
              <p style="font-size: 32px; color: #10B981; font-weight: bold; margin: 10px 0;">₹${data.amount?.toLocaleString()}</p>
            </div>
            <p style="color: #4b5563;"><strong>Cycle:</strong> ${data.cycle}</p>
            <p style="color: #4b5563;"><strong>Date:</strong> ${data.date}</p>
            <p style="font-size: 14px; color: #6b7280;">You can view your complete payout history in your dashboard.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.dashboardUrl}" style="background: #10B981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 600;">View Dashboard</a>
            </div>
          </div>
        </div>
      `
    },
    passwordReset: {
      subject: `Password Reset - ${data.siteName || 'Blisswell'}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #2563EB 0%, #10B981 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">🔒 Password Reset</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; color: #374151;">Hello ${data.name},</p>
            <p style="font-size: 16px; color: #374151;">We received a request to reset your password. Click the button below to create a new password:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.resetUrl}" style="background: #2563EB; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 600;">Reset Password</a>
            </div>
            <p style="font-size: 14px; color: #6b7280;">This link will expire in 1 hour for security reasons.</p>
            <p style="font-size: 14px; color: #6b7280;">If you did not request a password reset, please ignore this email. Your password will remain unchanged.</p>
            <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="font-size: 14px; color: #92400e; margin: 0;">⚠️ For your security, never share this link with anyone.</p>
            </div>
          </div>
        </div>
      `
    }
  };

  return templates[type] || { subject: 'Notification', html: '<p>You have a new notification.</p>' };
};

// Send email function
const sendEmail = async (to, type, data) => {
  try {
    const template = getEmailTemplate(type, data);
    const siteName = process.env.SITE_NAME || 'Blisswell';
    const fromEmail = process.env.SMTP_FROM || `info@blisswell.in`;

    const mailOptions = {
      from: `"${siteName}" <${fromEmail}>`,
      to,
      subject: template.subject,
      html: template.html
    };

    const transporter = await getTransporter();
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);

    // If using Ethereal, log the preview URL
    if (nodemailer.getTestMessageUrl(info)) {
      console.log('Preview URL: ' + nodemailer.getTestMessageUrl(info));
    }

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error: error.message };
  }
};

// Send welcome email
exports.sendWelcomeEmail = async (user) => {
  const siteUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  return sendEmail(user.email, 'welcome', {
    name: user.name,
    email: user.email,
    referralCode: user.referral_code,
    loginUrl: `${siteUrl}/login`,
    siteName: process.env.SITE_NAME || 'Blisswell'
  });
};

// Send purchase confirmation email
exports.sendPurchaseEmail = async (user, order, product) => {
  const siteUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  return sendEmail(user.email, 'purchase', {
    name: user.name,
    productName: product.name,
    amount: order.total_amount || product.price,
    orderId: order.id,
    date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    dashboardUrl: `${siteUrl}/orders`,
    siteName: process.env.SITE_NAME || 'Blisswell'
  });
};

// Send payout notification email
exports.sendPayoutEmail = async (user, amount, cycle) => {
  const siteUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  return sendEmail(user.email, 'payout', {
    name: user.name,
    amount: amount,
    cycle: cycle,
    date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    dashboardUrl: `${siteUrl}/salary`,
    siteName: process.env.SITE_NAME || 'Blisswell'
  });
};

// Send password reset email
exports.sendPasswordResetEmail = async (user) => {
  return sendEmail(user.email, 'passwordReset', {
    name: user.name,
    resetUrl: user.resetUrl,
    siteName: process.env.SITE_NAME || 'Blisswell'
  });
};

// Generic send email function
exports.send = sendEmail;