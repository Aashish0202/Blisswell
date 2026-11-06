// Single source of truth for admin report types.
// `key`  = the tab name used inside AdminReports for fetching/exporting
// `slug` = the URL segment used in routes and sidebar dropdown links
export const REPORT_TABS = [
  { key: 'sales', slug: 'sales', label: 'Sales' },
  { key: 'teamIncome', slug: 'team-income', label: 'Team Income' },
  { key: 'rewardIncome', slug: 'reward-income', label: 'Reward Income' },
  { key: 'withdrawals', slug: 'withdrawals', label: 'Withdrawals' },
  { key: 'userEarnings', slug: 'user-earnings', label: 'User Earnings' },
  { key: 'referrals', slug: 'referrals', label: 'Referrals' },
  { key: 'wallet', slug: 'wallet', label: 'Wallet' },
  { key: 'userFinancial', slug: 'user-financial', label: 'User Financial' },
  { key: 'userDetail', slug: 'user-detail', label: 'User Detail' },
];

export const slugToKey = (slug) =>
  (REPORT_TABS.find((t) => t.slug === slug) || {}).key;

export const keyToSlug = (key) =>
  (REPORT_TABS.find((t) => t.key === key) || {}).slug;