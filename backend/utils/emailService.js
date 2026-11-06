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
    qrApproved: {
      subject: `Payment Approved - ${data.siteName || 'Blisswell'}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #073C39 0%, #5D8172 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Payment Approved!</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; color: #374151;">Hello ${data.name},</p>
            <p style="font-size: 16px; color: #374151;">Your QR/UPI payment has been verified and your order is confirmed. Your account is now active.</p>
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #1f2937;">Order Details:</h3>
              <p style="color: #4b5563;"><strong>Product:</strong> ${data.productName}</p>
              <p style="color: #4b5563;"><strong>Amount:</strong> ₹${Number(data.amount || 0).toLocaleString()}</p>
              <p style="color: #4b5563;"><strong>Invoice No:</strong> ${data.invoiceNumber}</p>
              <p style="color: #4b5563;"><strong>Date:</strong> ${data.date}</p>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.dashboardUrl}" style="background: #073C39; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 600;">View Order</a>
            </div>
          </div>
        </div>
      `
    },
    qrRejected: {
      subject: `Payment Not Approved - ${data.siteName || 'Blisswell'}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #073C39 0%, #5D8172 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Payment Not Approved</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; color: #374151;">Hello ${data.name},</p>
            <p style="font-size: 16px; color: #374151;">We could not verify your QR/UPI payment for <strong>${data.productName}</strong> (₹${Number(data.amount || 0).toLocaleString()}, UTR ${data.utr}).</p>
            <div style="background: #fef2f2; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
              <p style="font-size: 15px; color: #991b1b; margin: 0;"><strong>Reason:</strong> ${data.reason}</p>
            </div>
            <p style="font-size: 14px; color: #6b7280;">You can submit the payment details again from your dashboard, or contact support if you believe this is a mistake.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.dashboardUrl}" style="background: #073C39; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 600;">Go to My Orders</a>
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
    },
    contact: {
      subject: `New Contact Form Message — ${data.subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #2563EB 0%, #10B981 100%); padding: 24px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">New Contact Message</h1>
          </div>
          <div style="background: #f9fafb; padding: 24px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; color: #374151;"><strong>From:</strong> ${data.name}</p>
            <p style="font-size: 14px; color: #4b5563;"><strong>Email:</strong> ${data.email}</p>
            <p style="font-size: 14px; color: #4b5563;"><strong>Phone:</strong> ${data.phone}</p>
            <p style="font-size: 14px; color: #4b5563;"><strong>Subject:</strong> ${data.subject}</p>
            <div style="background: white; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #2563EB;">
              <p style="font-size: 15px; color: #374151; margin: 0; white-space: pre-wrap;">${data.message}</p>
            </div>
            <p style="font-size: 13px; color: #6b7280;">Sent via the website contact form.</p>
          </div>
        </div>
      `
    }
  };

  return templates[type] || { subject: 'Notification', html: '<p>You have a new notification.</p>' };
};

const escapeHtml = (v) => String(v == null ? '' : v)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

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

// Send a contact-form message to the admin/owner inbox
exports.sendContactEmail = async ({ name, email, phone, subject, message, to }) => {
  const recipient = to || process.env.CONTACT_EMAIL || process.env.SMTP_FROM || 'info@blisswell.in';
  return sendEmail(recipient, 'contact', {
    name: name || 'Anonymous',
    email: email || '(not provided)',
    phone: phone || '(not provided)',
    subject: subject || 'No subject',
    message: message || ''
  });
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

// QR/UPI payment request approved by admin (order created)
exports.sendQrPaymentApprovedEmail = async (user, info) => {
  const siteUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  return sendEmail(user.email, 'qrApproved', {
    name: escapeHtml(user.name),
    productName: escapeHtml(info.productName),
    amount: info.amount,
    invoiceNumber: info.invoiceNumber,
    date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    dashboardUrl: `${siteUrl}/orders`,
    siteName: process.env.SITE_NAME || 'Blisswell'
  });
};

// QR/UPI payment request rejected by admin
exports.sendQrPaymentRejectedEmail = async (user, info) => {
  const siteUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  return sendEmail(user.email, 'qrRejected', {
    name: escapeHtml(user.name),
    productName: escapeHtml(info.productName),
    amount: info.amount,
    utr: escapeHtml(info.utr),
    reason: escapeHtml(info.reason),
    dashboardUrl: `${siteUrl}/orders`,
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