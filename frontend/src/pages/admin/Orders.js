import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { adminAPI } from '../../utils/api';
import AdminLayout from '../../components/AdminLayout';
import DataTable from '../../components/DataTable';
import ExportMenu from '../../components/ExportMenu';
import EmptyState from '../../components/EmptyState';
import LoadingSkeleton from '../../components/LoadingSkeleton';

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({ status: '', search: '' });

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filters.status]);

  const fetchOrders = async (overridePage, overrideFilters) => {
    setLoading(true);
    const usePage = overridePage ?? page;
    const useFilters = overrideFilters ?? filters;
    try {
      console.log('[Admin Orders] Fetching orders...', { usePage, useFilters });
      const response = await adminAPI.getOrders(usePage, useFilters);
      console.log('[Admin Orders] Response:', response.data);
      setOrders(response.data.orders || []);
      setTotalPages(response.data.pages || 1);
    } catch (error) {
      console.error('[Admin Orders] Error:', error);
      console.error('[Admin Orders] Error response:', error.response?.data);
      toast.error(error.response?.data?.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = (e) => {
    e.preventDefault();
    setPage(1);
    fetchOrders(1, filters);
  };

  const updateStatus = async (orderId, status) => {
    try {
      await adminAPI.updateOrderStatus(orderId, status);
      toast.success('Order status updated');
      fetchOrders();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  // No processing orders alert needed since we hide them

  const getImageUrl = (image) => {
    if (!image) return null;
    if (image.startsWith('http')) return image;
    const baseUrl = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api').replace('/api', '');
    return `${baseUrl}${image}`;
  };

  const columns = [
    {
      key: 'order_number',
      label: 'Order ID',
      render: (value) => <span className="order-number">#{value}</span>
    },
    {
      key: 'product_image',
      label: 'Product',
      render: (value, row) => (
        <div className="product-cell">
          {value ? (
            <img src={getImageUrl(value)} alt={row.product_name} className="product-thumb" />
          ) : (
            <div className="product-thumb-placeholder">
              <span>📦</span>
            </div>
          )}
          <div className="product-info">
            <span className="product-name">{row.product_name}</span>
            <span className="product-amount">₹{row.amount?.toLocaleString()}</span>
          </div>
        </div>
      )
    },
    {
      key: 'user_name',
      label: 'Customer',
      render: (value, row) => (
        <div>
          <span className="font-medium">{value}</span>
          <span className="block text-muted text-sm">{row.user_email}</span>
        </div>
      )
    },
    {
      key: 'payment_type',
      label: 'Payment',
      render: (value) => <span className="text-capitalize">{value}</span>
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => (
        <span className={`badge badge-${
          value === 'delivered' ? 'success' :
          value === 'cancelled' ? 'danger' :
          value === 'failed' ? 'danger' :
          value === 'shipped' ? 'info' :
          value === 'pending' ? 'secondary' : 'warning'
        }`}>
          {value}
        </span>
      )
    },
    {
      key: 'created_at',
      label: 'Date',
      render: (value) => new Date(value).toLocaleDateString()
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <select
          className="form-input form-input-sm"
          value={row.status}
          onChange={(e) => updateStatus(row.id, e.target.value)}
        >
          <option value="pending">pending</option>
          <option value="shipped">shipped</option>
          <option value="delivered">delivered</option>
          <option value="cancelled">cancelled</option>
        </select>
      )
    }
  ];

  const exportColumns = [
    { key: 'order_number', label: 'Order ID' },
    { key: 'user_name', label: 'Customer Name' },
    { key: 'user_email', label: 'Customer Email' },
    { key: 'product_name', label: 'Product' },
    { key: 'amount', label: 'Amount' },
    { key: 'payment_type', label: 'Payment Type' },
    { key: 'status', label: 'Status' },
    { key: 'created_at', label: 'Date' }
  ];

  if (loading && orders.length === 0) {
    return (
      <AdminLayout>
        <div className="admin-orders-page">
          <div className="page-header">
            <div>
              <h1 className="page-title">Order Management</h1>
            </div>
          </div>
          <LoadingSkeleton variant="card" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="admin-orders-page">
        {/* Page Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Order Management</h1>
            <p className="page-subtitle">Track and manage all orders</p>
          </div>
          <div className="page-header-actions">
            <ExportMenu
              fetchAll={async () => {
                const all = [];
                let p = 1, totalPages = 1;
                while (p <= totalPages) {
                  const res = await adminAPI.getOrders(p, filters);
                  all.push(...(res.data.orders || []));
                  totalPages = res.data.pages || Math.ceil((res.data.total || all.length) / 20);
                  p++;
                }
                if (all.length === 0) toast.info('No orders to export');
                return all;
              }}
              columns={exportColumns}
              filename="orders-export"
              title="Blisswell Orders"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="card">
          <form onSubmit={handleFilter} className="filter-form">
            <input
              type="text"
              className="form-input"
              placeholder="Search orders..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
            <select
              className="form-input"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="">All Status</option>
              <option value="pending">pending</option>
              <option value="shipped">shipped</option>
              <option value="delivered">delivered</option>
              <option value="cancelled">cancelled</option>
            </select>
            <button type="submit" className="btn btn-primary">Filter</button>
            {(filters.search || filters.status) && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setFilters({ status: '', search: '' });
                  setPage(1);
                }}
              >
                Clear
              </button>
            )}
          </form>
        </div>

        {/* Orders Table */}
        <div className="card">
          {orders.length > 0 ? (
            <DataTable
              columns={columns}
              data={orders}
              keyField="id"
              pagination={{
                page,
                pageSize: 20,
                total: totalPages * 20,
                onPageChange: setPage
              }}
              emptyMessage="No orders found"
            />
          ) : (
            <EmptyState
              icon="📦"
              title="No orders yet"
              description="Orders will appear here once customers start purchasing"
            />
          )}
        </div>
      </div>

      <style>{`
        .admin-orders-page {
          max-width: 1200px;
        }

        .page-header-actions {
          display: flex;
          gap: 0.75rem;
        }

        .filter-form {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        .filter-form .form-input {
          flex: 1;
          min-width: 150px;
        }

        .form-input-sm {
          padding: 0.25rem 0.5rem;
          font-size: 0.75rem;
        }

        .order-number {
          font-family: monospace;
          font-weight: 600;
          color: var(--gray-700);
        }

        .product-cell {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .product-thumb {
          width: 48px;
          height: 48px;
          border-radius: var(--radius-md);
          object-fit: cover;
          flex-shrink: 0;
        }

        .product-thumb-placeholder {
          width: 48px;
          height: 48px;
          border-radius: var(--radius-md);
          background: linear-gradient(135deg, var(--primary-50), var(--accent-50));
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .product-thumb-placeholder span {
          font-size: 1.25rem;
        }

        .product-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .product-name {
          font-weight: 500;
          color: var(--gray-900);
        }

        .product-amount {
          font-size: 0.75rem;
          color: var(--gray-500);
        }

        .font-medium { font-weight: 500; }
        .font-semibold { font-weight: 600; }
        .text-muted { color: var(--gray-500); }
        .text-sm { font-size: 0.75rem; }
        .text-primary { color: var(--primary-600); }
        .text-capitalize { text-transform: capitalize; }

        @media (max-width: 768px) {
          .filter-form {
            flex-direction: column;
          }
        }
      `}</style>
    </AdminLayout>
  );
};

export default AdminOrders;