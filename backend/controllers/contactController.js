const emailService = require('../utils/emailService');
const Settings = require('../models/Settings');

// Public contact form submission. Sends the message to the admin inbox
// (configured contact_email setting, or CONTACT_EMAIL / SMTP_FROM env).
exports.submitContact = async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ message: 'Name, email and message are required' });
    }
    if (message.length > 5000) {
      return res.status(400).json({ message: 'Message is too long' });
    }

    // Prefer the admin-configured contact email, fall back to env
    let to = null;
    try {
      to = await Settings.get('contact_email');
    } catch (e) { /* settings may not have it */ }

    const result = await emailService.sendContactEmail({
      name, email, phone, subject, message, to: to || undefined
    });

    if (result && result.success) {
      return res.json({ message: 'Your message has been sent. We will get back to you soon.' });
    }
    // Don't expose internal errors to the public; still log server-side
    console.error('Contact email failed:', result && result.error);
    return res.status(500).json({ message: 'Could not send your message right now. Please try again later.' });
  } catch (error) {
    console.error('Contact submit error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};