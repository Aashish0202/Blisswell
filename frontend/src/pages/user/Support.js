import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import DashboardLayout from '../../components/DashboardLayout';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import { ticketAPI } from '../../utils/api';

const Support = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [newTicket, setNewTicket] = useState({ subject: '', message: '' });
  const [replyMessage, setReplyMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const response = await ticketAPI.getUserTickets();
      setTickets(response.data.tickets);
    } catch (error) {
      toast.error('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  const createTicket = async (e) => {
    e.preventDefault();
    if (!newTicket.subject || !newTicket.message) {
      toast.error('Please fill in all fields');
      return;
    }

    setSubmitting(true);
    try {
      await ticketAPI.createTicket(newTicket);
      toast.success('Ticket created successfully');
      setShowModal(false);
      setNewTicket({ subject: '', message: '' });
      fetchTickets();
    } catch (error) {
      toast.error('Failed to create ticket');
    } finally {
      setSubmitting(false);
    }
  };

  const viewTicket = async (ticketId) => {
    try {
      const response = await ticketAPI.getTicketById(ticketId);
      setSelectedTicket(response.data);
    } catch (error) {
      toast.error('Failed to load ticket');
    }
  };

  const addReply = async (e) => {
    e.preventDefault();
    if (!replyMessage.trim()) return;

    setSubmitting(true);
    try {
      await ticketAPI.addMessage(selectedTicket.ticket.id, replyMessage);
      toast.success('Reply sent');
      setReplyMessage('');
      viewTicket(selectedTicket.ticket.id);
    } catch (error) {
      toast.error('Failed to send reply');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      open: { bg: '#FEF3C7', color: '#92400E' },
      in_progress: { bg: '#DBEAFE', color: '#1E40AF' },
      resolved: { bg: '#D1FAE5', color: '#065F46' },
      closed: { bg: '#F3F4F6', color: '#374151' }
    };
    const style = styles[status] || styles.open;
    return (
      <span style={{
        padding: '0.25rem 0.75rem',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: 600,
        background: style.bg,
        color: style.color
      }}>
        {status.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  if (loading) {
    return (
      <DashboardLayout>
        <LoadingSkeleton variant="card" />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="support-page">
        <div className="page-header">
          <div>
            <h1 className="page-title">Support</h1>
            <p className="page-subtitle">Get help with your issues</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            + New Ticket
          </button>
        </div>

        {tickets.length === 0 ? (
          <div className="card empty-state">
            <div className="empty-icon">🎫</div>
            <h3>No Support Tickets</h3>
            <p>You haven't created any support tickets yet.</p>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              Create Your First Ticket
            </button>
          </div>
        ) : (
          <div className="card">
            <div className="tickets-list">
              {tickets.map(ticket => (
                <div key={ticket.id} className="ticket-item" onClick={() => viewTicket(ticket.id)}>
                  <div className="ticket-info">
                    <h4>{ticket.subject}</h4>
                    <p className="ticket-preview">{ticket.message.substring(0, 100)}...</p>
                    <span className="ticket-date">
                      {new Date(ticket.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                  <div className="ticket-meta">
                    {getStatusBadge(ticket.status)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* New Ticket Modal */}
        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3 className="modal-title">Create Support Ticket</h3>
                <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
              </div>
              <form onSubmit={createTicket}>
                <div className="modal-body">
                  <div className="form-group">
                    <label className="form-label">Subject</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Brief description of your issue"
                      value={newTicket.subject}
                      onChange={e => setNewTicket({ ...newTicket, subject: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Message</label>
                    <textarea
                      className="form-input"
                      rows="5"
                      placeholder="Describe your issue in detail..."
                      value={newTicket.message}
                      onChange={e => setNewTicket({ ...newTicket, message: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? 'Creating...' : 'Create Ticket'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* View Ticket Modal */}
        {selectedTicket && (
          <div className="modal-overlay" onClick={() => setSelectedTicket(null)}>
            <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <h3 className="modal-title">{selectedTicket.ticket.subject}</h3>
                  {getStatusBadge(selectedTicket.ticket.status)}
                </div>
                <button className="modal-close" onClick={() => setSelectedTicket(null)}>×</button>
              </div>
              <div className="modal-body">
                <div className="ticket-messages">
                  {selectedTicket.messages.map(msg => (
                    <div key={msg.id} className={`message ${msg.sender_type}`}>
                      <div className="message-header">
                        <strong>{msg.sender_type === 'admin' ? 'Support Team' : 'You'}</strong>
                        <span className="message-time">
                          {new Date(msg.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p>{msg.message}</p>
                    </div>
                  ))}
                </div>

                {selectedTicket.ticket.status !== 'closed' && (
                  <form onSubmit={addReply} className="reply-form">
                    <textarea
                      className="form-input"
                      rows="3"
                      placeholder="Type your reply..."
                      value={replyMessage}
                      onChange={e => setReplyMessage(e.target.value)}
                    />
                    <button type="submit" className="btn btn-primary" disabled={submitting || !replyMessage.trim()}>
                      {submitting ? 'Sending...' : 'Send Reply'}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .support-page {
          max-width: 900px;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .tickets-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .ticket-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          border: 1px solid var(--gray-200);
          border-radius: var(--radius-lg);
          cursor: pointer;
          transition: all 0.2s;
        }

        .ticket-item:hover {
          border-color: var(--primary-300);
          background: var(--gray-50);
        }

        .ticket-info h4 {
          margin: 0 0 0.25rem 0;
          color: var(--gray-900);
        }

        .ticket-preview {
          color: var(--gray-600);
          font-size: 0.875rem;
          margin: 0 0 0.5rem 0;
        }

        .ticket-date {
          font-size: 0.75rem;
          color: var(--gray-500);
        }

        .modal-lg {
          max-width: 600px;
        }

        .ticket-messages {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-bottom: 1rem;
          max-height: 400px;
          overflow-y: auto;
        }

        .message {
          padding: 1rem;
          border-radius: var(--radius-lg);
        }

        .message.user {
          background: var(--primary-50);
          margin-left: 2rem;
        }

        .message.admin {
          background: var(--gray-100);
          margin-right: 2rem;
        }

        .message-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.5rem;
        }

        .message-time {
          font-size: 0.75rem;
          color: var(--gray-500);
        }

        .message p {
          margin: 0;
          white-space: pre-wrap;
        }

        .reply-form {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          padding-top: 1rem;
          border-top: 1px solid var(--gray-200);
        }

        .empty-state {
          text-align: center;
          padding: 3rem;
        }

        .empty-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
        }

        @media (max-width: 768px) {
          .page-header {
            flex-direction: column;
            gap: 1rem;
            align-items: flex-start;
          }

          .ticket-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.75rem;
          }
        }
      `}</style>
    </DashboardLayout>
  );
};

export default Support;