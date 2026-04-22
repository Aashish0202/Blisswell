import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { ticketAPI } from '../../utils/api';
import AdminLayout from '../../components/AdminLayout';
import DataTable from '../../components/DataTable';

const AdminTickets = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalTickets, setTotalTickets] = useState(0);
  const [filters, setFilters] = useState({ status: '', priority: '' });
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  useEffect(() => {
    fetchTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filters.status]);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const response = await ticketAPI.getAllTickets(page, filters);
      setTickets(response.data.tickets);
      setTotalTickets(response.data.total || response.data.tickets.length);
    } catch (error) {
      toast.error('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (ticketId, status) => {
    try {
      await ticketAPI.updateTicketStatus(ticketId, status);
      toast.success(`Ticket ${status}`);
      fetchTickets();
      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket({ ...selectedTicket, status });
      }
    } catch (error) {
      toast.error('Failed to update ticket status');
    }
  };

  const openTicket = async (ticket) => {
    try {
      const response = await ticketAPI.getTicketById(ticket.id);
      setSelectedTicket(response.data.ticket);
    } catch (error) {
      toast.error('Failed to load ticket details');
    }
  };

  const sendReply = async (e) => {
    e.preventDefault();
    if (!replyMessage.trim()) {
      toast.error('Please enter a message');
      return;
    }

    setSendingReply(true);
    try {
      await ticketAPI.addMessage(selectedTicket.id, replyMessage);
      toast.success('Reply sent');
      setReplyMessage('');
      // Refresh ticket details
      const response = await ticketAPI.getTicketById(selectedTicket.id);
      setSelectedTicket(response.data.ticket);
    } catch (error) {
      toast.error('Failed to send reply');
    } finally {
      setSendingReply(false);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const columns = [
    {
      key: 'id',
      label: 'ID',
      render: (value) => `#${value}`
    },
    {
      key: 'subject',
      label: 'Subject',
      render: (value, row) => (
        <div className="ticket-subject" onClick={() => openTicket(row)}>
          <strong>{value}</strong>
          <span className="ticket-category">{row.category}</span>
        </div>
      )
    },
    {
      key: 'user_name',
      label: 'User',
      render: (value, row) => (
        <div className="user-cell">
          <span>{value}</span>
          <span className="user-email">{row.user_email}</span>
        </div>
      )
    },
    {
      key: 'priority',
      label: 'Priority',
      render: (value) => (
        <span className={`badge badge-priority-${value}`}>
          {value}
        </span>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => (
        <span className={`badge badge-status-${value}`}>
          {value}
        </span>
      )
    },
    {
      key: 'created_at',
      label: 'Created',
      render: (value) => formatDate(value)
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div className="action-buttons">
          <button
            className="btn btn-primary btn-sm"
            onClick={() => openTicket(row)}
          >
            View
          </button>
          {row.status === 'open' && (
            <button
              className="btn btn-success btn-sm"
              onClick={(e) => {
                e.stopPropagation();
                updateStatus(row.id, 'resolved');
              }}
            >
              Resolve
            </button>
          )}
          {row.status === 'resolved' && (
            <button
              className="btn btn-danger btn-sm"
              onClick={(e) => {
                e.stopPropagation();
                updateStatus(row.id, 'closed');
              }}
            >
              Close
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <AdminLayout>
      <div className="admin-tickets-page">
        <div className="page-header">
          <div>
            <h1 className="page-title">Support Tickets</h1>
            <p className="page-subtitle">Manage customer support tickets</p>
          </div>
        </div>

        {/* Filters */}
        <div className="card">
          <div className="filters">
            <div className="filter-group">
              <label>Status:</label>
              <select
                className="form-input"
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              >
                <option value="">All</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div className="filter-group">
              <label>Priority:</label>
              <select
                className="form-input"
                value={filters.priority}
                onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
              >
                <option value="">All</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <button className="btn btn-ghost" onClick={() => setFilters({ status: '', priority: '' })}>
              Clear Filters
            </button>
          </div>
        </div>

        {/* Tickets Table */}
        <div className="card">
          {tickets.length > 0 ? (
            <DataTable
              columns={columns}
              data={tickets}
              keyField="id"
              pagination={{
                page,
                pageSize: 20,
                total: totalTickets,
                onPageChange: setPage
              }}
              emptyMessage="No tickets found"
            />
          ) : (
            <div className="empty-state">
              <span className="empty-icon">🎫</span>
              <h3>No tickets found</h3>
              <p>{filters.status || filters.priority ? 'Try adjusting your filters' : 'Tickets will appear here when users create them'}</p>
            </div>
          )}
        </div>

        {/* Ticket Detail Modal */}
        {selectedTicket && (
          <div className="modal-overlay" onClick={() => setSelectedTicket(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div className="modal-title-wrapper">
                  <h3>Ticket #{selectedTicket.id}</h3>
                  <span className={`status-badge status-${selectedTicket.status}`}>
                    {selectedTicket.status}
                  </span>
                </div>
                <button className="modal-close" onClick={() => setSelectedTicket(null)}>×</button>
              </div>

              <div className="ticket-subject-header">
                <h4>{selectedTicket.subject}</h4>
              </div>

              <div className="ticket-meta-grid">
                <div className="meta-card">
                  <span className="meta-label">From</span>
                  <span className="meta-value">{selectedTicket.user_name}</span>
                  <span className="meta-sub">{selectedTicket.user_email}</span>
                </div>
                <div className="meta-card">
                  <span className="meta-label">Priority</span>
                  <span className={`priority-badge priority-${selectedTicket.priority || 'medium'}`}>
                    {selectedTicket.priority || 'medium'}
                  </span>
                </div>
                <div className="meta-card">
                  <span className="meta-label">Created</span>
                  <span className="meta-value">{formatDate(selectedTicket.created_at)}</span>
                </div>
                <div className="meta-card">
                  <span className="meta-label">Last Updated</span>
                  <span className="meta-value">{formatDate(selectedTicket.updated_at || selectedTicket.created_at)}</span>
                </div>
              </div>

              <div className="ticket-messages-section">
                <h4>Conversation</h4>
                <div className="messages-list">
                  {selectedTicket.messages && selectedTicket.messages.length > 0 ? (
                    selectedTicket.messages.map((msg, index) => (
                      <div key={index} className={`message-item ${msg.sender_type === 'admin' ? 'admin-message' : 'user-message'}`}>
                        <div className="message-avatar">
                          {msg.sender_type === 'admin' ? '👤' : '🙋'}
                        </div>
                        <div className="message-content">
                          <div className="message-header">
                            <span className="sender-name">
                              {msg.sender_type === 'admin' ? 'Support Team' : selectedTicket.user_name}
                            </span>
                            <span className="message-time">{formatDate(msg.created_at)}</span>
                          </div>
                          <div className="message-text">{msg.message}</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="no-messages">
                      <p>No messages yet</p>
                    </div>
                  )}
                </div>
              </div>

              {selectedTicket.status !== 'closed' && (
                <div className="reply-section">
                  <h4>Reply</h4>
                  <form onSubmit={sendReply}>
                    <textarea
                      className="reply-textarea"
                      placeholder="Type your reply to the customer..."
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      rows="4"
                      required
                    />
                    <div className="reply-actions">
                      <button type="submit" className="btn btn-primary" disabled={sendingReply}>
                        {sendingReply ? 'Sending...' : 'Send Reply'}
                      </button>
                      <div className="status-actions">
                        {selectedTicket.status === 'open' && (
                          <button
                            type="button"
                            className="btn btn-success"
                            onClick={() => updateStatus(selectedTicket.id, 'resolved')}
                          >
                            ✓ Mark Resolved
                          </button>
                        )}
                        {selectedTicket.status === 'resolved' && (
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => updateStatus(selectedTicket.id, 'closed')}
                          >
                            Close Ticket
                          </button>
                        )}
                      </div>
                    </div>
                  </form>
                </div>
              )}

              {selectedTicket.status === 'closed' && (
                <div className="ticket-closed-notice">
                  <span className="closed-icon">🔒</span>
                  <span>This ticket has been closed</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <style>{`
        .admin-tickets-page {
          max-width: 1200px;
        }

        .page-header {
          margin-bottom: 2rem;
        }

        .filters {
          display: flex;
          gap: 1rem;
          align-items: flex-end;
          flex-wrap: wrap;
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .filter-group label {
          font-size: 0.875rem;
          color: #6b7280;
        }

        .filter-group .form-input {
          min-width: 150px;
        }

        .ticket-subject {
          cursor: pointer;
          color: #2563eb;
        }

        .ticket-subject:hover {
          text-decoration: underline;
        }

        .ticket-category {
          display: block;
          font-size: 0.75rem;
          color: #6b7280;
        }

        .user-cell {
          display: flex;
          flex-direction: column;
        }

        .user-email {
          font-size: 0.75rem;
          color: #6b7280;
        }

        .badge {
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .badge-priority-low { background: #E5E7EB; color: #374151; }
        .badge-priority-medium { background: #FEF3C7; color: #92400E; }
        .badge-priority-high { background: #FEE2E2; color: #991B1B; }
        .badge-priority-urgent { background: #DC2626; color: white; }

        .badge-status-open { background: #DBEAFE; color: #1E40AF; }
        .badge-status-in_progress { background: #FEF3C7; color: #92400E; }
        .badge-status-resolved { background: #D1FAE5; color: #065F46; }
        .badge-status-closed { background: #E5E7EB; color: #374151; }

        .action-buttons {
          display: flex;
          gap: 0.5rem;
        }

        .empty-state {
          text-align: center;
          padding: 3rem;
        }

        .empty-icon {
          font-size: 3rem;
          display: block;
          margin-bottom: 1rem;
        }

        /* Modal Styles - Improved */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
          backdrop-filter: blur(4px);
        }

        .modal-content {
          background: #ffffff;
          border-radius: 16px;
          width: 100%;
          max-width: 750px;
          max-height: 90vh;
          overflow: hidden;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          display: flex;
          flex-direction: column;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.25rem 1.5rem;
          background: linear-gradient(135deg, #2563eb 0%, #10b981 100%);
          color: white;
        }

        .modal-title-wrapper {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .modal-header h3 {
          margin: 0;
          font-size: 1.125rem;
        }

        .status-badge {
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: capitalize;
          background: rgba(255,255,255,0.2);
        }

        .modal-close {
          background: rgba(255,255,255,0.2);
          border: none;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          font-size: 1.25rem;
          cursor: pointer;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
        }

        .modal-close:hover {
          background: rgba(255,255,255,0.3);
        }

        .ticket-subject-header {
          padding: 1.25rem 1.5rem;
          background: #f9fafb;
          border-bottom: 1px solid #e5e7eb;
        }

        .ticket-subject-header h4 {
          margin: 0;
          font-size: 1rem;
          color: #1f2937;
        }

        .ticket-meta-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1px;
          background: #e5e7eb;
          border-bottom: 1px solid #e5e7eb;
        }

        .meta-card {
          background: white;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .meta-label {
          font-size: 0.75rem;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .meta-value {
          font-size: 0.875rem;
          color: #1f2937;
          font-weight: 500;
        }

        .meta-sub {
          font-size: 0.75rem;
          color: #9ca3af;
        }

        .priority-badge {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: capitalize;
        }

        .priority-low { background: #e5e7eb; color: #374151; }
        .priority-medium { background: #fef3c7; color: #92400e; }
        .priority-high { background: #fee2e2; color: #991b1b; }
        .priority-urgent { background: #dc2626; color: white; }

        .ticket-messages-section {
          padding: 1.5rem;
          flex: 1;
          overflow-y: auto;
          max-height: 300px;
        }

        .ticket-messages-section h4 {
          margin: 0 0 1rem;
          font-size: 0.875rem;
          color: #374151;
        }

        .messages-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .message-item {
          display: flex;
          gap: 0.75rem;
        }

        .message-item.admin-message {
          flex-direction: row-reverse;
        }

        .message-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: #e5e7eb;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1rem;
          flex-shrink: 0;
        }

        .admin-message .message-avatar {
          background: #dbeafe;
        }

        .message-content {
          flex: 1;
          min-width: 0;
        }

        .message-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.25rem;
        }

        .admin-message .message-header {
          flex-direction: row-reverse;
        }

        .sender-name {
          font-size: 0.8125rem;
          font-weight: 600;
          color: #1f2937;
        }

        .message-time {
          font-size: 0.6875rem;
          color: #9ca3af;
        }

        .message-text {
          font-size: 0.875rem;
          color: #374151;
          line-height: 1.5;
          background: #f3f4f6;
          padding: 0.75rem 1rem;
          border-radius: 12px;
          white-space: pre-wrap;
          word-wrap: break-word;
        }

        .admin-message .message-text {
          background: #dbeafe;
        }

        .no-messages {
          text-align: center;
          padding: 2rem;
          color: #9ca3af;
        }

        .reply-section {
          padding: 1.5rem;
          background: #f9fafb;
          border-top: 1px solid #e5e7eb;
        }

        .reply-section h4 {
          margin: 0 0 1rem;
          font-size: 0.875rem;
          color: #374151;
        }

        .reply-textarea {
          width: 100%;
          padding: 0.875rem 1rem;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 0.875rem;
          resize: vertical;
          min-height: 100px;
          font-family: inherit;
        }

        .reply-textarea:focus {
          outline: none;
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        .reply-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 1rem;
          gap: 1rem;
        }

        .status-actions {
          display: flex;
          gap: 0.5rem;
        }

        .ticket-closed-notice {
          padding: 1.5rem;
          background: #f3f4f6;
          text-align: center;
          color: #6b7280;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .closed-icon {
          font-size: 1.25rem;
        }

        @media (max-width: 768px) {
          .filters {
            flex-direction: column;
            align-items: stretch;
          }

          .filter-group .form-input {
            width: 100%;
          }

          .action-buttons {
            flex-direction: column;
          }

          .modal-content {
            margin: 0.5rem;
            max-height: 95vh;
          }

          .ticket-meta-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .reply-actions {
            flex-direction: column;
          }

          .reply-actions .btn {
            width: 100%;
          }
        }
      `}</style>
    </AdminLayout>
  );
};

export default AdminTickets;