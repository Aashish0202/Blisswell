const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const { verifyToken, isAdmin } = require('../middleware/auth');

// User routes
router.post('/', verifyToken, ticketController.createTicket);
router.get('/my', verifyToken, ticketController.getUserTickets);
router.get('/:id', verifyToken, ticketController.getTicketById);
router.post('/:id/message', verifyToken, ticketController.addMessage);
router.put('/:id/close', verifyToken, ticketController.closeTicket);

// Admin routes
router.get('/admin/all', verifyToken, isAdmin, ticketController.getAllTickets);
router.put('/admin/:id/status', verifyToken, isAdmin, ticketController.updateTicketStatus);

module.exports = router;