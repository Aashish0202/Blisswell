import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { adminAPI } from '../../utils/api';
import AdminLayout from '../../components/AdminLayout';
import DataTable from '../../components/DataTable';
import BulkActionToolbar from '../../components/BulkActionToolbar';
import ExportButton from '../../components/ExportButton';
import ConfirmationDialog from '../../components/ConfirmationDialog';
import EmptyState from '../../components/EmptyState';
import LoadingSkeleton from '../../components/LoadingSkeleton';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [filters, setFilters] = useState({ search: '' });
  const [selectedRows, setSelectedRows] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, type: '', userIds: [] });
  const [kycModal, setKycModal] = useState({ isOpen: false, kyc: null, userId: null });
  const [rejectReason, setRejectReason] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [editFormData, setEditFormData] = useState({
    bank_name: '',
    account_number: '',
    ifsc_code: '',
    branch_name: '',
    nominee_name: '',
    nominee_relation: ''
  });
  const [saving, setSaving] = useState(false);
  const [editUserModal, setEditUserModal] = useState({ isOpen: false, user: null });
  const [editUserData, setEditUserData] = useState({
    name: '',
    mobile: '',
    pan_number: '',
    gst_number: '',
    state: '',
    address: ''
  });
  const [editUserSaving, setEditUserSaving] = useState(false);

  // Calculate pending alerts for admin banner
  const pendingPAN = users.filter(u => u.pan_status === 'pending').length;

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await adminAPI.getUsers(page, filters);
      setUsers(response.data.users);
      setTotalUsers(response.data.total || response.data.users.length);
    } catch (error) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const toggleStatus = async (userId, currentStatus) => {
    try {
      await adminAPI.toggleUserStatus(userId, !currentStatus);
      toast.success('User status updated');
      fetchUsers();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const approvePAN = async (userId) => {
    try {
      await adminAPI.approvePAN(userId);
      toast.success('PAN approved');
      fetchUsers();
    } catch (error) {
      toast.error('Failed to approve PAN');
    }
  };

  const viewKYC = async (userId) => {
    try {
      const response = await adminAPI.getUserKYC(userId);
      setKycModal({ isOpen: true, kyc: response.data.kyc, userId });
      setRejectReason('');
      setEditMode(false);
      if (response.data.kyc) {
        setEditFormData({
          bank_name: response.data.kyc.bank_name || '',
          account_number: response.data.kyc.account_number || '',
          ifsc_code: response.data.kyc.ifsc_code || '',
          branch_name: response.data.kyc.branch_name || '',
          nominee_name: response.data.kyc.nominee_name || '',
          nominee_relation: response.data.kyc.nominee_relation || ''
        });
      }
    } catch (error) {
      toast.error('Failed to load KYC details');
    }
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  const saveKYCEdit = async () => {
    if (!kycModal.kyc) return;

    setSaving(true);
    try {
      await adminAPI.updateKYC(kycModal.kyc.id, editFormData);
      toast.success('KYC updated successfully');
      setEditMode(false);
      // Refresh KYC data
      const response = await adminAPI.getUserKYC(kycModal.userId);
      setKycModal({ isOpen: true, kyc: response.data.kyc, userId: kycModal.userId });
    } catch (error) {
      toast.error('Failed to update KYC');
    } finally {
      setSaving(false);
    }
  };

  const approveKYC = async (kycId) => {
    try {
      await adminAPI.approveKYC(kycId);
      toast.success('KYC approved successfully');
      setKycModal({ isOpen: false, kyc: null, userId: null });
      fetchUsers();
    } catch (error) {
      toast.error('Failed to approve KYC');
    }
  };

  const rejectKYC = async (kycId) => {
    if (!rejectReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }
    try {
      await adminAPI.rejectKYC(kycId, rejectReason);
      toast.success('KYC rejected');
      setKycModal({ isOpen: false, kyc: null, userId: null });
      fetchUsers();
    } catch (error) {
      toast.error('Failed to reject KYC');
    }
  };

  const loginAsUser = async (userId, userName) => {
    try {
      const response = await adminAPI.loginAsUser(userId);
      const { token, user } = response.data;

      // Store the token and user data
      localStorage.setItem('adminToken', localStorage.getItem('token'));
      localStorage.setItem('adminUser', localStorage.getItem('user'));
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      // Open user dashboard in new tab
      window.open('/dashboard', '_blank');
      toast.success(`Logged in as ${userName}`);
    } catch (error) {
      toast.error('Failed to login as user');
    }
  };

  const openEditUserModal = async (userId) => {
    try {
      const response = await adminAPI.getUserById(userId);
      const user = response.data.user;
      setEditUserData({
        name: user.name || '',
        mobile: user.mobile || '',
        pan_number: user.pan_number || '',
        gst_number: user.gst_number || '',
        state: user.state || '',
        address: user.address || ''
      });
      setEditUserModal({ isOpen: true, user: user });
    } catch (error) {
      toast.error('Failed to load user details');
    }
  };

  const closeEditUserModal = () => {
    setEditUserModal({ isOpen: false, user: null });
    setEditUserData({
      name: '',
      mobile: '',
      pan_number: '',
      gst_number: '',
      state: '',
      address: ''
    });
  };

  const handleEditUserChange = (e) => {
    const { name, value } = e.target;
    setEditUserData(prev => ({ ...prev, [name]: value }));
  };

  const saveUserDetails = async () => {
    if (!editUserModal.user) return;

    setEditUserSaving(true);
    try {
      await adminAPI.updateUserDetails(editUserModal.user.id, editUserData);
      toast.success('User details updated successfully');
      closeEditUserModal();
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update user details');
    } finally {
      setEditUserSaving(false);
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedRows.length === 0) return;

    setConfirmDialog({
      isOpen: true,
      type: action,
      userIds: selectedRows
    });
  };

  const executeBulkAction = async () => {
    const { type, userIds } = confirmDialog;
    try {
      // Execute bulk action based on type
      for (const userId of userIds) {
        if (type === 'block') {
          await adminAPI.toggleUserStatus(userId, false);
        } else if (type === 'unblock') {
          await adminAPI.toggleUserStatus(userId, true);
        } else if (type === 'approve_pan') {
          await adminAPI.approvePAN(userId);
        }
      }
      toast.success(`Successfully updated ${userIds.length} users`);
      setSelectedRows([]);
      fetchUsers();
    } catch (error) {
      toast.error('Failed to update users');
    } finally {
      setConfirmDialog({ isOpen: false, type: '', userIds: [] });
    }
  };

  const columns = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'email', label: 'Email', sortable: true },
    { key: 'mobile', label: 'Mobile' },
    { key: 'referral_code', label: 'Referral Code' },
    {
      key: 'pan_status',
      label: 'PAN Status',
      render: (value, row) => (
        <span className={`badge badge-${
          value === 'approved' ? 'success' :
          value === 'rejected' ? 'danger' : 'warning'
        }`}>
          {value}
        </span>
      )
    },
    {
      key: 'kyc_status',
      label: 'KYC Status',
      render: (value, row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className={`badge badge-${
            value === 'approved' ? 'success' :
            value === 'rejected' ? 'danger' : 'warning'
          }`}>
            {value || 'Not Submitted'}
          </span>
          {value && value !== 'approved' && (
            <button
              className="btn btn-sm btn-ghost"
              onClick={(e) => {
                e.stopPropagation();
                viewKYC(row.id);
              }}
              title="View KYC Details"
            >
              👁️
            </button>
          )}
        </div>
      )
    },
    {
      key: 'has_active_package',
      label: 'Package',
      render: (value) => (
        <span className={`badge badge-${value ? 'success' : 'warning'}`}>
          {value ? 'Active' : 'Inactive'}
        </span>
      )
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (value) => (
        <span className={`badge badge-${value ? 'success' : 'danger'}`}>
          {value ? 'Active' : 'Blocked'}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div className="action-buttons">
          <button
            className="btn btn-secondary btn-sm"
            onClick={(e) => {
              e.stopPropagation();
              openEditUserModal(row.id);
            }}
            title="Edit user details"
          >
            ✏️ Edit
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={(e) => {
              e.stopPropagation();
              loginAsUser(row.id, row.name);
            }}
            title="Login as this user"
          >
            🔑 Login
          </button>
          {row.pan_status === 'pending' && (
            <button
              className="btn btn-success btn-sm"
              onClick={(e) => {
                e.stopPropagation();
                approvePAN(row.id);
              }}
            >
              Approve PAN
            </button>
          )}
          <button
            className={`btn ${row.is_active ? 'btn-danger' : 'btn-success'} btn-sm`}
            onClick={(e) => {
              e.stopPropagation();
              toggleStatus(row.id, row.is_active);
            }}
          >
            {row.is_active ? 'Block' : 'Unblock'}
          </button>
        </div>
      )
    }
  ];

  const exportColumns = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'mobile', label: 'Mobile' },
    { key: 'referral_code', label: 'Referral Code' },
    { key: 'pan_number', label: 'PAN Number' },
    { key: 'pan_status', label: 'PAN Status' },
    { key: 'has_active_package', label: 'Has Package' },
    { key: 'is_active', label: 'Status' },
    { key: 'created_at', label: 'Joined' }
  ];

  const alerts = pendingPAN > 0 ? [
    { label: 'Pending PAN Approvals', count: pendingPAN, href: '/admin/users', variant: 'warning' }
  ] : [];

  if (loading && users.length === 0) {
    return (
      <AdminLayout alerts={alerts}>
        <div className="admin-users-page">
          <div className="page-header">
            <div>
              <h1 className="page-title">User Management</h1>
              <p className="page-subtitle">Manage and monitor all users</p>
            </div>
          </div>
          <LoadingSkeleton variant="card" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout alerts={alerts}>
      <div className="admin-users-page">
        {/* Page Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">User Management</h1>
            <p className="page-subtitle">Manage and monitor all registered users</p>
          </div>
          <div className="page-header-actions">
            <ExportButton
              data={users}
              columns={exportColumns}
              filename="users-export"
              label="Export CSV"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="card">
          <form onSubmit={handleSearch} className="filter-form">
            <input
              type="text"
              className="form-input"
              placeholder="Search by name, email, mobile..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
            <button type="submit" className="btn btn-primary">Search</button>
            {filters.search && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setFilters({ search: '' });
                  setPage(1);
                  setTimeout(fetchUsers, 0);
                }}
              >
                Clear
              </button>
            )}
          </form>
        </div>

        {/* Bulk Action Toolbar */}
        <BulkActionToolbar
          selectedCount={selectedRows.length}
          totalCount={users.length}
          onClearSelection={() => setSelectedRows([])}
          onSelectAll={() => setSelectedRows(users.map(u => u.id))}
          actions={[
            {
              label: 'Block Selected',
              icon: '🚫',
              variant: 'danger',
              onClick: () => handleBulkAction('block')
            },
            {
              label: 'Unblock Selected',
              icon: '✅',
              variant: 'success',
              onClick: () => handleBulkAction('unblock')
            }
          ]}
        />

        {/* Users Table */}
        <div className="card">
          {users.length > 0 ? (
            <DataTable
              columns={columns}
              data={users}
              keyField="id"
              selectable={true}
              selectedRows={selectedRows}
              onSelectionChange={setSelectedRows}
              pagination={{
                page,
                pageSize: 20,
                total: totalUsers,
                onPageChange: setPage
              }}
              emptyMessage="No users found"
            />
          ) : (
            <EmptyState
              icon="👥"
              title="No users found"
              description={filters.search ? 'Try adjusting your search terms' : 'Users will appear here once they register'}
            />
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, type: '', userIds: [] })}
        onConfirm={executeBulkAction}
        title={`${confirmDialog.type === 'block' ? 'Block' : 'Unblock'} Users`}
        message={`Are you sure you want to ${confirmDialog.type === 'block' ? 'block' : 'unblock'} ${confirmDialog.userIds.length} selected users?`}
        confirmText="Confirm"
        variant={confirmDialog.type === 'block' ? 'danger' : 'info'}
      />

      {/* KYC Modal */}
      {kycModal.isOpen && (
        <div className="modal-overlay" onClick={() => setKycModal({ isOpen: false, kyc: null, userId: null })}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>KYC Details {editMode && '(Edit Mode)'}</h3>
              <button className="modal-close" onClick={() => setKycModal({ isOpen: false, kyc: null, userId: null })}>
                ×
              </button>
            </div>
            <div className="modal-body">
              {kycModal.kyc ? (
                <>
                  {editMode ? (
                    // Edit Form
                    <div className="kyc-edit-form">
                      <div className="form-group">
                        <label>Bank Name</label>
                        <input
                          type="text"
                          name="bank_name"
                          className="form-input"
                          value={editFormData.bank_name}
                          onChange={handleEditChange}
                          placeholder="Enter bank name"
                        />
                      </div>
                      <div className="form-group">
                        <label>Account Number</label>
                        <input
                          type="text"
                          name="account_number"
                          className="form-input"
                          value={editFormData.account_number}
                          onChange={handleEditChange}
                          placeholder="Enter account number"
                        />
                      </div>
                      <div className="form-group">
                        <label>IFSC Code</label>
                        <input
                          type="text"
                          name="ifsc_code"
                          className="form-input"
                          value={editFormData.ifsc_code}
                          onChange={handleEditChange}
                          placeholder="Enter IFSC code"
                        />
                      </div>
                      <div className="form-group">
                        <label>Branch Name</label>
                        <input
                          type="text"
                          name="branch_name"
                          className="form-input"
                          value={editFormData.branch_name}
                          onChange={handleEditChange}
                          placeholder="Enter branch name"
                        />
                      </div>
                      <div className="form-group">
                        <label>Nominee Name</label>
                        <input
                          type="text"
                          name="nominee_name"
                          className="form-input"
                          value={editFormData.nominee_name}
                          onChange={handleEditChange}
                          placeholder="Enter nominee name"
                        />
                      </div>
                      <div className="form-group">
                        <label>Nominee Relation</label>
                        <input
                          type="text"
                          name="nominee_relation"
                          className="form-input"
                          value={editFormData.nominee_relation}
                          onChange={handleEditChange}
                          placeholder="Enter nominee relation"
                        />
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <>
                      <div className="kyc-detail-row">
                        <span className="kyc-label">Bank Name:</span>
                        <span className="kyc-value">{kycModal.kyc.bank_name}</span>
                      </div>
                      <div className="kyc-detail-row">
                        <span className="kyc-label">Account Number:</span>
                        <span className="kyc-value">{kycModal.kyc.account_number}</span>
                      </div>
                      <div className="kyc-detail-row">
                        <span className="kyc-label">IFSC Code:</span>
                        <span className="kyc-value">{kycModal.kyc.ifsc_code}</span>
                      </div>
                      <div className="kyc-detail-row">
                        <span className="kyc-label">Branch Name:</span>
                        <span className="kyc-value">{kycModal.kyc.branch_name || 'N/A'}</span>
                      </div>
                      <div className="kyc-detail-row">
                        <span className="kyc-label">Nominee:</span>
                        <span className="kyc-value">{kycModal.kyc.nominee_name || 'N/A'}</span>
                      </div>
                      <div className="kyc-detail-row">
                        <span className="kyc-label">Nominee Relation:</span>
                        <span className="kyc-value">{kycModal.kyc.nominee_relation || 'N/A'}</span>
                      </div>
                      <div className="kyc-detail-row">
                        <span className="kyc-label">Status:</span>
                        <span className={`badge badge-${
                          kycModal.kyc.kyc_status === 'approved' ? 'success' :
                          kycModal.kyc.kyc_status === 'rejected' ? 'danger' : 'warning'
                        }`}>
                          {kycModal.kyc.kyc_status}
                        </span>
                      </div>
                      {kycModal.kyc.kyc_status === 'rejected' && kycModal.kyc.rejected_reason && (
                        <div className="kyc-detail-row">
                          <span className="kyc-label">Rejection Reason:</span>
                          <span className="kyc-value" style={{ color: 'var(--status-danger)' }}>
                            {kycModal.kyc.rejected_reason}
                          </span>
                        </div>
                      )}
                    </>
                  )}

                  <div className="kyc-actions">
                    {editMode ? (
                      <div className="action-buttons-row">
                        <button
                          className="btn btn-ghost"
                          onClick={() => setEditMode(false)}
                          disabled={saving}
                        >
                          Cancel
                        </button>
                        <button
                          className="btn btn-primary"
                          onClick={saveKYCEdit}
                          disabled={saving}
                        >
                          {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          className="btn btn-ghost"
                          onClick={() => setEditMode(true)}
                        >
                          ✏️ Edit KYC
                        </button>
                        {kycModal.kyc.kyc_status === 'pending' && (
                          <>
                            <div className="reject-section">
                              <input
                                type="text"
                                className="form-input"
                                placeholder="Rejection reason (required for rejection)"
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                              />
                            </div>
                            <div className="action-buttons-row">
                              <button
                                className="btn btn-success"
                                onClick={() => approveKYC(kycModal.kyc.id)}
                              >
                                ✓ Approve KYC
                              </button>
                              <button
                                className="btn btn-danger"
                                onClick={() => rejectKYC(kycModal.kyc.id)}
                              >
                                ✗ Reject KYC
                              </button>
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </>
              ) : (
                <p className="no-kyc">No KYC details submitted yet.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit User Details Modal */}
      {editUserModal.isOpen && (
        <div className="modal-overlay" onClick={closeEditUserModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit User Details</h2>
              <button className="close-btn" onClick={closeEditUserModal}>×</button>
            </div>
            <div className="modal-body">
              <div className="edit-user-form">
                <div className="form-group">
                  <label>Name</label>
                  <input
                    type="text"
                    name="name"
                    className="form-input"
                    value={editUserData.name}
                    onChange={handleEditUserChange}
                    placeholder="Enter name"
                  />
                </div>
                <div className="form-group">
                  <label>Mobile</label>
                  <input
                    type="text"
                    name="mobile"
                    className="form-input"
                    value={editUserData.mobile}
                    onChange={handleEditUserChange}
                    placeholder="Enter mobile number"
                    maxLength={10}
                  />
                </div>
                <div className="form-group">
                  <label>PAN Number</label>
                  <input
                    type="text"
                    name="pan_number"
                    className="form-input"
                    value={editUserData.pan_number}
                    onChange={handleEditUserChange}
                    placeholder="ABCDE1234F"
                    maxLength={10}
                    style={{ textTransform: 'uppercase' }}
                  />
                  <small className="form-hint">10 characters (5 letters + 4 digits + 1 letter)</small>
                </div>
                <div className="form-group">
                  <label>GST Number</label>
                  <input
                    type="text"
                    name="gst_number"
                    className="form-input"
                    value={editUserData.gst_number}
                    onChange={handleEditUserChange}
                    placeholder="27ANJPC4891P1ZB"
                    maxLength={15}
                    style={{ textTransform: 'uppercase' }}
                  />
                  <small className="form-hint">15 characters GSTIN</small>
                </div>
                <div className="form-group">
                  <label>State</label>
                  <select
                    name="state"
                    className="form-input"
                    value={editUserData.state}
                    onChange={handleEditUserChange}
                  >
                    <option value="">Select State</option>
                    <option value="Andhra Pradesh">Andhra Pradesh</option>
                    <option value="Arunachal Pradesh">Arunachal Pradesh</option>
                    <option value="Assam">Assam</option>
                    <option value="Bihar">Bihar</option>
                    <option value="Chhattisgarh">Chhattisgarh</option>
                    <option value="Goa">Goa</option>
                    <option value="Gujarat">Gujarat</option>
                    <option value="Haryana">Haryana</option>
                    <option value="Himachal Pradesh">Himachal Pradesh</option>
                    <option value="Jharkhand">Jharkhand</option>
                    <option value="Karnataka">Karnataka</option>
                    <option value="Kerala">Kerala</option>
                    <option value="Madhya Pradesh">Madhya Pradesh</option>
                    <option value="Maharashtra">Maharashtra</option>
                    <option value="Manipur">Manipur</option>
                    <option value="Meghalaya">Meghalaya</option>
                    <option value="Mizoram">Mizoram</option>
                    <option value="Nagaland">Nagaland</option>
                    <option value="Odisha">Odisha</option>
                    <option value="Punjab">Punjab</option>
                    <option value="Rajasthan">Rajasthan</option>
                    <option value="Sikkim">Sikkim</option>
                    <option value="Tamil Nadu">Tamil Nadu</option>
                    <option value="Telangana">Telangana</option>
                    <option value="Tripura">Tripura</option>
                    <option value="Uttar Pradesh">Uttar Pradesh</option>
                    <option value="Uttarakhand">Uttarakhand</option>
                    <option value="West Bengal">West Bengal</option>
                    <option value="Delhi">Delhi</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Address</label>
                  <textarea
                    name="address"
                    className="form-input"
                    value={editUserData.address}
                    onChange={handleEditUserChange}
                    placeholder="Enter address"
                    rows={3}
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={closeEditUserModal}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={saveUserDetails}
                disabled={editUserSaving}
              >
                {editUserSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .admin-users-page {
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
          min-width: 200px;
        }

        .action-buttons {
          display: flex;
          gap: 0.5rem;
        }

        @media (max-width: 768px) {
          .filter-form {
            flex-direction: column;
          }

          .action-buttons {
            flex-direction: column;
          }
        }

        /* KYC Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: white;
          border-radius: var(--radius-xl);
          width: 90%;
          max-width: 500px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: var(--shadow-lg);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid var(--gray-200);
        }

        .modal-header h2,
        .modal-header h3 {
          margin: 0;
          font-size: 1.125rem;
          color: var(--gray-900);
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: var(--gray-500);
          padding: 0.25rem;
          line-height: 1;
        }

        .close-btn:hover {
          color: var(--gray-700);
        }

        .modal-close {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: var(--gray-500);
          padding: 0.25rem;
          line-height: 1;
        }

        .modal-close:hover {
          color: var(--gray-700);
        }

        .modal-body {
          padding: 1.5rem;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          padding: 1rem 1.5rem;
          border-top: 1px solid var(--gray-200);
          background: var(--gray-50);
        }

        .edit-user-form .form-group {
          margin-bottom: 1rem;
        }

        .edit-user-form .form-group label {
          display: block;
          font-weight: 500;
          margin-bottom: 0.5rem;
          color: var(--gray-700);
        }

        .edit-user-form .form-hint {
          display: block;
          font-size: 0.75rem;
          color: var(--gray-500);
          margin-top: 0.25rem;
        }

        .kyc-detail-row {
          display: flex;
          justify-content: space-between;
          padding: 0.75rem 0;
          border-bottom: 1px solid var(--gray-100);
        }

        .kyc-detail-row:last-of-type {
          border-bottom: none;
        }

        .kyc-label {
          font-weight: 500;
          color: var(--gray-600);
        }

        .kyc-value {
          color: var(--gray-900);
          text-align: right;
        }

        .no-kyc {
          text-align: center;
          color: var(--gray-500);
          padding: 2rem;
        }

        .kyc-actions {
          margin-top: 1.5rem;
          padding-top: 1rem;
          border-top: 1px solid var(--gray-200);
        }

        .reject-section {
          margin-bottom: 1rem;
        }

        .reject-section .form-input {
          width: 100%;
        }

        .action-buttons-row {
          display: flex;
          gap: 0.75rem;
          justify-content: flex-end;
        }

        /* KYC Edit Form */
        .kyc-edit-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .kyc-edit-form .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .kyc-edit-form .form-group label {
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--gray-700);
        }

        .kyc-edit-form .form-input {
          padding: 0.75rem;
          border: 1px solid var(--gray-300);
          border-radius: var(--radius-md);
          font-size: 0.875rem;
        }

        .kyc-edit-form .form-input:focus {
          outline: none;
          border-color: var(--primary-500);
          box-shadow: 0 0 0 3px var(--primary-100);
        }

        .kyc-actions {
          margin-top: 1.5rem;
          padding-top: 1rem;
          border-top: 1px solid var(--gray-200);
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .kyc-actions > .btn-ghost {
          width: 100%;
        }
      `}}</style>
    </AdminLayout>
  );
};

export default AdminUsers;