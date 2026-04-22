const Ticket = require('../models/Ticket');

// User: Create a new ticket
exports.createTicket = async (req, res) => {
  try {
    const { subject, message } = req.body;
    const userId = req.user.id;

    if (!subject || !message) {
      return res.status(400).json({ message: 'Subject and message are required' });
    }

    const ticketId = await Ticket.create({
      user_id: userId,
      subject,
      message
    });

    // Add initial message
    await Ticket.addMessage(ticketId, {
      sender_id: userId,
      sender_type: 'user',
      message
    });

    const ticket = await Ticket.findById(ticketId);

    res.status(201).json({
      message: 'Ticket created successfully',
      ticket
    });
  } catch (error) {
    console.error('Create ticket error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// User: Get own tickets
exports.getUserTickets = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const tickets = await Ticket.getByUserId(req.user.id, page, 20);

    res.json({ tickets });
  } catch (error) {
    console.error('Get user tickets error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// User/Admin: Get ticket by ID
exports.getTicketById = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Check if user owns this ticket (unless admin)
    if (req.user.role !== 'admin' && ticket.user_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const messages = await Ticket.getMessages(req.params.id);

    res.json({ ticket, messages });
  } catch (error) {
    console.error('Get ticket error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// User/Admin: Add message to ticket
exports.addMessage = async (req, res) => {
  try {
    const { message } = req.body;
    const ticketId = req.params.id;

    if (!message) {
      return res.status(400).json({ message: 'Message is required' });
    }

    const ticket = await Ticket.findById(ticketId);

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Check if user owns this ticket (unless admin)
    if (req.user.role !== 'admin' && ticket.user_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await Ticket.addMessage(ticketId, {
      sender_id: req.user.id,
      sender_type: req.user.role === 'admin' ? 'admin' : 'user',
      message
    });

    // If user adds message and ticket was closed, reopen it
    if (req.user.role !== 'admin' && ticket.status === 'closed') {
      await Ticket.updateStatus(ticketId, 'open');
    }

    const messages = await Ticket.getMessages(ticketId);

    res.json({
      message: 'Message added successfully',
      messages
    });
  } catch (error) {
    console.error('Add message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// User: Close own ticket
exports.closeTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    if (ticket.user_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await Ticket.updateStatus(req.params.id, 'closed');

    res.json({ message: 'Ticket closed successfully' });
  } catch (error) {
    console.error('Close ticket error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin: Get all tickets
exports.getAllTickets = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const filters = {
      status: req.query.status,
      search: req.query.search
    };

    const tickets = await Ticket.getAll(page, 20, filters);
    const total = await Ticket.count(filters);
    const counts = await Ticket.getCounts();

    res.json({
      tickets,
      page,
      total,
      pages: Math.ceil(total / 20),
      counts
    });
  } catch (error) {
    console.error('Get all tickets error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin: Update ticket status
exports.updateTicketStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const ticketId = req.params.id;

    if (!['open', 'in_progress', 'resolved', 'closed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    await Ticket.updateStatus(ticketId, status);

    res.json({ message: 'Ticket status updated' });
  } catch (error) {
    console.error('Update ticket status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};