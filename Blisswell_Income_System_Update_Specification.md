# Door Mat Income System — Update Specification

## 1. Purpose

This document defines the changes required to update the already-developed application according to the latest Door Mat product, Self Cashback, Team Income, qualification, withdrawal, wallet, reporting, naming, Admin settings, and Cloud Code requirements.

This is an **update to the existing system**, not a new application build.

All existing working modules should be preserved unless explicitly changed below.

---

# 2. Product Configuration

## Product

- Product Name: **Door Mat**
- Product Price: **₹599**

The product should be configurable from Admin where the existing product-management architecture supports it.

---

# 3. Self Cashback

## Default Configuration

- Self Cashback Status: **ON**
- Cashback Amount Per Claim: **₹10**
- Maximum Claims: **20**
- Maximum Self Cashback: **₹200**

Calculation:

`₹10 × 20 claims = ₹200`

## Business Rules

1. Self Cashback is attached to an eligible product purchase.
2. The user can claim Self Cashback using a **Claim Cashback** button.
3. A user can make **only one successful Self Cashback claim per calendar day**.
4. The user does **not** have to claim on consecutive days.
5. Unclaimed cashback does **not expire**.
6. The user can claim at any time until the maximum number of claims is reached.
7. Maximum claims for one eligible purchase are 20.
8. Once 20 claims are completed, the Self Cashback entitlement is completed.
9. The frontend must display claim progress clearly.
10. All claim validation must be performed server-side through Cloud Code/backend logic.

## Example

A user claims:

- Claim 1 → ₹10
- Claim 2 → ₹10
- Claim 3 → ₹10
- Skips several days
- Claim 4 later → ₹10

This is valid.

The user still has the remaining claims available.

---

# 4. Self Cashback Claim Button

## User Interface

Display:

- Self Cashback
- Cashback per claim
- Claims completed
- Remaining claims
- Total cashback earned
- Remaining cashback
- Claim Cashback button

Example:

```text
Self Cashback

₹10 per claim

Claims Completed: 8 / 20
Remaining Claims: 12

Total Earned: ₹80
Remaining: ₹120

[ CLAIM ₹10 ]
```

## Button States

### Eligible

```text
[ CLAIM ₹10 ]
```

### Already Claimed Today

```text
Today's cashback has already been claimed.
Next claim available tomorrow.
```

### Completed

```text
Self Cashback Completed.
You have claimed all 20 cashback installments.
```

### Cashback Disabled for New Purchases

Do not show a misleading claim option for purchases that were made after Self Cashback was disabled.

---

# 5. Self Cashback Admin ON/OFF

Admin must have a global Self Cashback switch:

```text
Self Cashback: ON / OFF
```

## ON

New eligible purchases receive Self Cashback eligibility according to the current configuration.

## OFF

From the exact point the Admin switches Self Cashback OFF:

- New product purchases must not receive new Self Cashback eligibility.
- No new Self Cashback entitlement should be created for purchases made after the OFF timestamp.

## Existing Entitlements

Existing purchases that already have a valid Self Cashback entitlement should retain their already-created entitlement and claims.

This prevents an Admin configuration change from unexpectedly removing a user's previously created entitlement.

The implementation should store the entitlement state at purchase/eligibility creation rather than recalculating historical eligibility solely from the current global switch.

---

# 6. Team Income — 10 Levels

## Default Income Configuration

| Level | Income |
|---|---:|
| Level 1 | ₹100 |
| Level 2 | ₹30 |
| Level 3 | ₹30 |
| Level 4 | ₹30 |
| Level 5 | ₹30 |
| Level 6 | ₹30 |
| Level 7 | ₹30 |
| Level 8 | ₹30 |
| Level 9 | ₹30 |
| Level 10 | ₹30 |

These values must be **Admin configurable**.

Do not hard-code the income amounts inside Cloud Code or frontend logic.

---

# 7. Team Level Qualification

The qualification structure is:

| Qualified Direct Users | Maximum Unlocked Level |
|---:|---:|
| 0 | No team level |
| 1 | Level 2 |
| 2 | Level 4 |
| 3 | Level 6 |
| 4 | Level 8 |
| 5 or more | Level 10 |

Formula:

`Maximum Unlocked Level = MIN(Qualified Directs × 2, 10)`

Therefore:

- 1 direct → Levels 1–2
- 2 directs → Levels 1–4
- 3 directs → Levels 1–6
- 4 directs → Levels 1–8
- 5 directs → Levels 1–10

## Important

The application must use a clearly defined concept of **Qualified Direct**.

If the existing application already has a qualification rule, preserve and map it to this structure.

If qualification is based on a direct user's completed/eligible product purchase, the system should count only qualifying users according to that existing business rule.

Do not count arbitrary registrations unless the existing business logic explicitly defines registration as qualification.

---

# 8. Team Income Distribution Logic

When a qualifying income event occurs:

1. Identify the source user/transaction.
2. Traverse the sponsor/upline relationship.
3. Determine the upline level from Level 1 through Level 10.
4. For each upline user:
   - Determine qualified direct count.
   - Calculate maximum unlocked level.
   - Check whether the current level is unlocked.
   - Fetch the configured income amount for that level.
   - Credit the eligible team income.
5. Create a wallet transaction.
6. Create the corresponding report/earning record.
7. Maintain a complete audit trail.

## Example

User has 3 qualified direct users.

Maximum unlocked level = 6.

Therefore:

- Level 1 → Eligible
- Level 2 → Eligible
- Level 3 → Eligible
- Level 4 → Eligible
- Level 5 → Eligible
- Level 6 → Eligible
- Level 7 → Locked
- Level 8 → Locked
- Level 9 → Locked
- Level 10 → Locked

---

# 9. Cloud Code Requirements

All financial/business-critical operations must be controlled through Cloud Code/backend logic.

## Cloud Code Responsibilities

Cloud Code should handle:

- Self Cashback claim validation
- One-claim-per-day validation
- Maximum claim validation
- Cashback eligibility validation
- Self Cashback configuration lookup
- Team-level qualification calculation
- Upline traversal
- Team income calculation
- Wallet credit transactions
- Withdrawal validation
- Withdrawal request creation
- Duplicate transaction protection
- Transaction/audit record creation

## Never Trust Frontend Values

The frontend must not be allowed to directly determine:

- Cashback amount
- Number of completed claims
- Team income amount
- User's qualified direct count
- User's unlocked level
- Wallet balance
- Withdrawal eligibility

All of these must be calculated or verified server-side.

---

# 10. Self Cashback Claim Cloud Function

Create/update the existing claim functionality so that the backend follows this sequence:

```text
1. Authenticate user
2. Identify eligible Self Cashback entitlement
3. Check Self Cashback entitlement status
4. Check completed claim count
5. Check whether user already claimed today
6. Read configured cashback amount
7. Credit cashback
8. Increment successful claim count
9. Create wallet transaction
10. Create earning/report transaction
11. Return updated cashback status
```

## Validation

Reject when:

- User is unauthenticated.
- No eligible entitlement exists.
- Maximum claims have already been completed.
- User has already successfully claimed today.
- Entitlement is invalid/closed.
- Transaction has already been processed.

The operation should be **idempotent** so that double-clicks, retries, network retries, or duplicate requests cannot create duplicate cashback.

---

# 11. Wallet Update

The existing wallet module must be updated to clearly distinguish income types.

## Recommended Income Types

Use standardized transaction types:

```text
SELF_CASHBACK
TEAM_INCOME
WITHDRAWAL
WITHDRAWAL_REVERSAL
```

For Team Income, additionally store:

```text
TEAM_INCOME_LEVEL_1
TEAM_INCOME_LEVEL_2
...
TEAM_INCOME_LEVEL_10
```

Prefer storing the normalized transaction category plus a separate `level` field rather than creating ten unrelated wallet systems.

## Self Cashback Transaction Example

```text
Type: SELF_CASHBACK
Amount: ₹10
Reference: Door Mat Purchase
Claim Number: 8
Claim Limit: 20
```

## Team Income Transaction Example

```text
Type: TEAM_INCOME
Level: 1
Amount: ₹100
Source User: [user reference]
```

---

# 12. Wallet Naming Changes

Review all existing wallet labels and rename them according to the new terminology.

Recommended user-facing names:

### Main Wallet

**Wallet Balance**

### Withdrawable Amount

**Available for Withdrawal**

### Self Cashback

**Self Cashback**

### Team Income

**Team Income**

### Total Earnings

**Total Earnings**

Avoid old names such as:

- ROI
- Daily ROI
- Product Return
- Investment Income
- Investment Cashback
- Package Income

unless those terms are genuinely used elsewhere in the existing system.

The terminology must match the actual Door Mat business model.

---

# 13. Wallet Balance Rules

Wallet calculations must be based on transaction records rather than frontend counters.

Recommended structure:

```text
Total Earnings
    ├── Self Cashback
    └── Team Income

Withdrawals
    ├── Pending
    ├── Approved/Processed
    └── Rejected/Reversed

Available for Withdrawal
```

The exact existing wallet architecture should be preserved where possible, but all labels and transaction classifications should be updated.

---

# 14. Withdrawal System

## Minimum Withdrawal

Default:

**₹200**

Admin configurable.

## Withdrawal Request Window

Users can create withdrawal requests only:

**Every day from 7:00 AM to 10:00 AM**

This is the **request submission window**.

It does not necessarily mean that Admin must process the withdrawal during this window.

---

# 15. Withdrawal Validation

When a user submits a withdrawal request, Cloud Code must verify:

```text
1. User is authenticated
2. Current server time is within withdrawal window
3. Requested amount >= minimum withdrawal
4. Requested amount <= available withdrawal balance
5. Amount is valid
6. User does not have a conflicting pending withdrawal
7. Create withdrawal request
8. Reserve/deduct the requested amount according to existing wallet architecture
9. Create withdrawal transaction
```

## Outside Withdrawal Window

Return:

```text
Withdrawal requests are accepted daily from 7:00 AM to 10:00 AM.
Please try again during the withdrawal window.
```

## Below Minimum

Return:

```text
Minimum withdrawal amount is ₹200.
```

---

# 16. Server Time

Withdrawal-window validation must use **server-side time**, not the device's local time.

The system should define the business timezone as:

**Asia/Kolkata (IST)**

Admin-configured withdrawal times should be interpreted in this timezone unless the existing architecture has a different explicit timezone requirement.

---

# 17. Admin Settings

Create/update the Admin configuration page.

## Self Cashback Settings

```text
Self Cashback
-------------------------
Status: ON / OFF

Amount Per Claim: ₹10
Maximum Claims: 20

[Save]
```

## Team Income Settings

```text
Team Income
-------------------------

Level 1:  ₹100
Level 2:  ₹30
Level 3:  ₹30
Level 4:  ₹30
Level 5:  ₹30
Level 6:  ₹30
Level 7:  ₹30
Level 8:  ₹30
Level 9:  ₹30
Level 10: ₹30

[Save Level Income]
```

## Qualification Settings

```text
Levels Unlocked Per Qualified Direct: 2
Maximum Team Levels: 10
```

This makes the qualification rule configurable while retaining the current default.

## Withdrawal Settings

```text
Minimum Withdrawal: ₹200

Withdrawal Start: 07:00 AM
Withdrawal End:   10:00 AM

Timezone: Asia/Kolkata
```

---

# 18. Admin Settings Audit

Every change to financial settings should be logged.

Record:

- Admin/user ID
- Setting name
- Previous value
- New value
- Date/time
- IP/device metadata if already supported by the existing audit architecture

Example:

```text
Setting: Level 1 Team Income
Previous: ₹100
New: ₹120
Changed By: Admin
Changed At: 03 Sep 2026 11:20 AM
```

---

# 19. Reports — Required Updates

The existing Reports module must be reviewed and updated.

## User Earnings Report

Show:

- User
- Total Earnings
- Self Cashback
- Team Income
- Number of Cashback Claims
- Available for Withdrawal
- Total Withdrawn

## Self Cashback Report

Columns:

| Field | Description |
|---|---|
| User | Cashback recipient |
| Product | Door Mat |
| Order | Related purchase |
| Claim No. | 1–20 |
| Amount | ₹10 |
| Claim Date | Successful claim date |
| Status | Credited/Failed |
| Transaction ID | Wallet transaction reference |

## Team Income Report

Columns:

| Field | Description |
|---|---|
| Recipient | User receiving income |
| Source User | User generating the qualifying event |
| Level | 1–10 |
| Amount | Configured level amount |
| Date | Income date |
| Status | Credited/Reversed |
| Transaction ID | Wallet reference |

## Withdrawal Report

Show:

- User
- Requested Amount
- Request Date
- Request Time
- Status
- Payment/reference details
- Processed Date
- Rejection reason if applicable

Add filters for:

- Date
- User
- Status
- Income type
- Team level
- Transaction ID

---

# 20. Dashboard Reports / Statistics

Update existing dashboard cards.

Recommended cards:

```text
Total Users
Total Product Purchases
Total Product Sales
Total Self Cashback Paid
Total Team Income Paid
Total Withdrawals Requested
Total Withdrawals Processed
Pending Withdrawals
```

If existing cards use old income terminology, replace them with the new terminology.

---

# 21. User Reports / Earnings Page

The user's earnings page should separate income clearly.

Example:

```text
My Earnings

Total Earnings        ₹500
Self Cashback         ₹200
Team Income           ₹300

Available Withdrawal  ₹250
Pending Withdrawal    ₹100
Total Withdrawn       ₹150
```

Then show transaction history.

---

# 22. Product Purchase → Income Relationship

The system should maintain a clear relationship:

```text
Door Mat Purchase
        │
        ├── Self Cashback Entitlement
        │       ├── Claim 1
        │       ├── Claim 2
        │       ├── ...
        │       └── Claim 20
        │
        └── Qualifying Team Income Event
                ├── Level 1
                ├── Level 2
                ├── ...
                └── Level 10
```

Do not mix Self Cashback transactions and Team Income transactions into one generic income type.

---

# 23. Naming Standardization

Perform a complete search across:

- Frontend
- Backend
- Cloud Code
- Database fields where appropriate
- Reports
- Admin panel
- Wallet
- Transaction history
- Notifications
- Emails
- API responses
- Dashboard cards
- Export files
- Error messages

Replace outdated business terminology with the new terminology.

## Preferred Terms

| Old/Generic Concept | New Term |
|---|---|
| Cashback | Self Cashback |
| Referral Income | Team Income |
| Level Income | Team Income — Level X |
| Daily Cashback | Self Cashback Claim |
| Claim | Self Cashback Claim |
| Withdrawal Limit | Minimum Withdrawal |
| Withdrawal Timing | Withdrawal Request Window |
| Direct Member | Qualified Direct |
| Level Unlock | Team Level Qualification |

Do not rename technical/database identifiers unnecessarily if changing them could break existing data or APIs. Prefer user-facing terminology changes while maintaining backward-compatible internal identifiers where appropriate.

---

# 24. Notifications

Update notifications to use the new terminology.

## Cashback Success

```text
Self Cashback Claimed

₹10 Self Cashback has been credited to your wallet.

Claim: 8 of 20
```

## Cashback Completed

```text
Self Cashback Completed

You have completed all 20 Self Cashback claims for this purchase.
```

## Withdrawal Window

```text
Withdrawal requests are open daily from 7:00 AM to 10:00 AM.
```

## Withdrawal Submitted

```text
Withdrawal Request Submitted

Your withdrawal request of ₹200 has been submitted successfully.
```

---

# 25. Data Model / Database Considerations

Do not destroy existing historical financial records.

Where possible, extend the existing schema.

Recommended Self Cashback fields:

```text
selfCashbackEnabled
cashbackAmount
maxClaims
claimsCompleted
lastClaimAt
entitlementStatus
purchaseId
userId
```

Recommended Team Income fields:

```text
incomeType
level
amount
recipientUserId
sourceUserId
transactionId
createdAt
status
```

Recommended Withdrawal fields:

```text
userId
amount
status
requestedAt
processedAt
rejectionReason
transactionId
```

Use the existing database naming conventions if they are already established.

---

# 26. Concurrency & Duplicate Protection

This is critical because wallet operations involve money.

Cloud Code must prevent:

- Double cashback from double-clicking.
- Duplicate cashback from API retries.
- Duplicate team-income credit.
- Duplicate withdrawal requests.
- Race conditions when two requests happen simultaneously.
- Wallet balance corruption.

Use atomic database operations/transactions or the strongest transaction/locking mechanism supported by the current backend.

Every financial operation should have a unique transaction/reference key.

---

# 27. Historical Data

Existing historical transactions must remain accessible.

Do not simply rename or overwrite historical financial records in a way that changes their original meaning.

If the previous application has older income types:

- Preserve historical records.
- Map them correctly in reports.
- Update current user-facing labels only where the old terminology is no longer applicable.
- Do not recalculate historical income using new Admin settings.

New configuration values should apply according to the intended effective-date/business rule.

---

# 28. Configuration Effective Date

When Admin changes:

- Self Cashback amount
- Maximum claims
- Team level income
- Minimum withdrawal
- Withdrawal window

the system should record when the change became effective.

For already-created Self Cashback entitlements, do not unexpectedly change the user's entitlement unless that behavior is explicitly intended.

For Team Income, define whether a new level amount applies to future qualifying income only. Recommended behavior:

**New configuration applies to future income events; already credited income remains unchanged.**

---

# 29. Security

Admin-only settings must be protected.

Only authorized Admin users can:

- Enable/disable Self Cashback.
- Change Self Cashback amount.
- Change maximum claims.
- Change Team Income amounts.
- Change qualification settings.
- Change withdrawal minimum.
- Change withdrawal window.

These permissions must be validated server-side.

Do not rely only on hiding Admin UI controls.

---

# 30. API / Cloud Code Response Requirements

API responses should return enough information for the frontend to render the current state without performing financial calculations.

Example Self Cashback response:

```json
{
  "eligible": true,
  "amountPerClaim": 10,
  "claimsCompleted": 8,
  "maxClaims": 20,
  "remainingClaims": 12,
  "totalEarned": 80,
  "remainingAmount": 120,
  "claimedToday": false
}
```

Example Team Income response:

```json
{
  "qualifiedDirects": 3,
  "maxUnlockedLevel": 6,
  "levels": [
    {
      "level": 1,
      "amount": 100,
      "unlocked": true
    },
    {
      "level": 2,
      "amount": 30,
      "unlocked": true
    }
  ]
}
```

Frontend should consume these values rather than independently calculating financial eligibility.

---

# 31. Testing Requirements

Before deployment, test at minimum:

## Self Cashback

- Purchase with Self Cashback ON.
- Purchase with Self Cashback OFF.
- First claim.
- Second claim on next day.
- Multiple claims on same day.
- Claim after skipped days.
- Claim 20.
- Attempt claim 21.
- Double-click claim.
- API retry.
- Existing entitlement after Admin switches OFF.
- New purchase after Admin switches OFF.

## Team Income

- 0 qualified directs.
- 1 qualified direct.
- 2 qualified directs.
- 3 qualified directs.
- 4 qualified directs.
- 5 qualified directs.
- More than 5 qualified directs.
- Level 1–10 distribution.
- Locked level.
- Changed Admin income values.
- Upline traversal.
- Duplicate event protection.

## Withdrawal

- ₹199.
- ₹200.
- More than ₹200.
- Insufficient balance.
- Request before 7 AM.
- Request at 7 AM.
- Request during window.
- Request at 10 AM boundary.
- Request after 10 AM.
- Duplicate request.
- Pending withdrawal.
- Admin processing/rejection.

Use server time in all withdrawal tests.

---

# 32. Acceptance Criteria

The update is considered complete only when:

- Door Mat is configured at ₹599.
- Self Cashback is ₹10 × 20 claims = ₹200 by default.
- Claim button works once per day.
- Claims do not expire.
- Maximum is exactly 20 successful claims per entitlement.
- Self Cashback ON/OFF works correctly.
- Existing entitlements are handled safely.
- Team Income has 10 levels.
- Default amounts are correctly configured.
- Admin can change all 10 level amounts.
- Direct qualification unlocks 2 levels per qualified direct.
- 5 qualified directs unlock all 10 levels.
- Cloud Code validates all financial operations.
- Wallet records Self Cashback separately from Team Income.
- Reports show the new income categories and levels.
- Withdrawal minimum is ₹200 by default.
- Withdrawal requests are accepted only from 7 AM to 10 AM IST.
- Server-side time is used.
- Duplicate financial transactions are prevented.
- Admin changes are audited.
- Existing historical records are preserved.
- Old/inaccurate user-facing naming is removed.
- Frontend, Cloud Code, reports, wallets, notifications, and Admin settings use consistent terminology.
- Full regression testing confirms existing unaffected modules continue to work.

---

# 33. Final Implementation Direction

This should be treated as an **update of the existing developed application**.

The development team should first audit the current implementation and identify:

1. Existing product/order module.
2. Existing wallet architecture.
3. Existing income/commission module.
4. Existing referral/sponsor tree.
5. Existing Cloud Code functions.
6. Existing Admin settings.
7. Existing reports.
8. Existing withdrawal module.
9. Existing notifications.
10. Existing naming/labels.

Then modify the existing architecture instead of creating duplicate modules.

### Priority Order

```text
1. Database / configuration model
2. Cloud Code / backend financial logic
3. Wallet & transaction structure
4. Product / purchase relationship
5. Self Cashback claim
6. Team Income qualification/distribution
7. Withdrawal rules
8. Admin settings
9. Reports
10. User dashboard
11. Notifications
12. Naming cleanup
13. Security review
14. Full regression testing
```

The most important principle is:

**Frontend displays the rules; Cloud Code enforces the rules; Wallet records the financial result; Reports expose the financial history; Admin controls the configurable values.**
