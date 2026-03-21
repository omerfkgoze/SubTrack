# Epic 7 Preparation: Privacy & Compliance Review — Bank Data

**Date:** 2026-03-21
**Owner:** Alice (Product Owner)
**Task:** Review GDPR requirements for financial data, App Store/Play Store disclosures, privacy policy updates

---

## Summary

Epic 7 introduces bank account connectivity and transaction data access. This significantly expands SubTrack's data processing scope from user-entered subscription data to **real financial data from banks**. This document covers the privacy and compliance requirements that must be addressed before Story 7.1.

---

## 1. GDPR Requirements for Financial Data

### Legal Basis for Processing

| Data Type                                 | Legal Basis                            | Justification                                   |
| ----------------------------------------- | -------------------------------------- | ----------------------------------------------- |
| Bank account metadata (name, IBAN last 4) | **Consent** (Art. 6(1)(a))             | User explicitly connects bank account           |
| Transaction history                       | **Consent** (Art. 6(1)(a))             | User explicitly grants access via Tink Link SCA |
| Detected subscriptions                    | **Contract** (Art. 6(1)(b))            | Core app functionality the user signed up for   |
| Connection tokens                         | **Legitimate interest** (Art. 6(1)(f)) | Technical necessity for maintaining service     |

### Consent Requirements (Art. 7)

Financial data consent must meet a **higher bar** than standard data consent:

| Requirement      | Implementation                                                               |
| ---------------- | ---------------------------------------------------------------------------- |
| **Freely given** | Bank connection is optional — app works without it                           |
| **Specific**     | Consent screen states exactly what data is accessed (accounts, transactions) |
| **Informed**     | Clear explanation of why data is needed (subscription detection)             |
| **Unambiguous**  | Explicit "Connect Bank" action — no pre-checked boxes                        |
| **Withdrawable** | "Disconnect Bank" button available at any time (Story 7.7)                   |
| **Granular**     | Separate consent per bank connection — not blanket consent                   |

### In-App Consent Screen Content (Before Tink Link Opens)

The following must be shown **before** the user enters Tink Link:

```
📋 Bank Connection Consent

By connecting your bank account, you agree that SubTrack will:

✅ Access your account information (account name, balance)
✅ Access your transaction history (last 90 days)
✅ Analyze transactions to detect recurring subscriptions
✅ Store detected subscription data in your SubTrack account

SubTrack will NOT:
❌ Access your bank login credentials (handled securely by Tink)
❌ Make payments or transfers from your account
❌ Share your financial data with third parties
❌ Store raw transaction data longer than 30 days

You can disconnect your bank at any time in Settings.

[Connect Bank Account]    [Cancel]
```

### Data Minimization (Art. 5(1)(c))

| Principle                  | Implementation                                                                                       |
| -------------------------- | ---------------------------------------------------------------------------------------------------- |
| Collect only what's needed | Request only `accounts:read` and `transactions:read` scopes                                          |
| No excessive history       | Fetch last 90 days of transactions — sufficient for subscription detection                           |
| No storage beyond purpose  | Raw transactions deleted after 30 days (detection complete)                                          |
| No secondary use           | Bank data used exclusively for subscription detection — never for analytics, marketing, or profiling |

### Data Subject Rights (Enhanced for Financial Data)

| Right                       | Implementation                                                     | Deadline  |
| --------------------------- | ------------------------------------------------------------------ | --------- |
| **Access** (Art. 15)        | Export includes bank connection history and detected subscriptions | 1 month   |
| **Erasure** (Art. 17)       | "Delete Account" removes all bank data, revokes Tink tokens        | 1 month   |
| **Portability** (Art. 20)   | Bank-detected subscriptions included in JSON/CSV export            | 1 month   |
| **Withdrawal of consent**   | "Disconnect Bank" immediately stops data access                    | Immediate |
| **Rectification** (Art. 16) | User can edit detected subscription details                        | Immediate |

### Data Processing Record (Art. 30)

SubTrack must maintain a record of processing activities for bank data:

| Field                | Value                                                                         |
| -------------------- | ----------------------------------------------------------------------------- |
| Controller           | SubTrack (GOZE)                                                               |
| Purpose              | Automatic subscription detection from bank transactions                       |
| Data categories      | Bank account metadata, transaction data (amount, description, date, category) |
| Data subjects        | Premium users who connect bank accounts                                       |
| Recipients           | Tink (AISP processor), Supabase (infrastructure processor)                    |
| Transfers outside EU | Supabase region: EU (Frankfurt) — no transfer outside EU                      |
| Retention period     | Raw transactions: 30 days. Detected subscriptions: until user deletion        |
| Security measures    | Encryption at rest, TLS in transit, RLS per user, token encryption            |

### Data Protection Impact Assessment (DPIA — Art. 35)

**A DPIA is required before Epic 7 Story 7.1.**

GDPR Art. 35 mandates a DPIA when processing is "likely to result in a high risk." The EDPB lists two criteria that apply to SubTrack's bank feature:

| Criterion | SubTrack Bank Feature |
|---|---|
| **Sensitive data** (financial data) | ✅ Transaction history, bank account data |
| **Automated decision-making / profiling** | ✅ Subscription detection algorithm analyzes spending patterns |

Two criteria = DPIA mandatory per EDPB guidelines.

#### Minimum DPIA Content (Art. 35(7))

| Section | Content |
|---|---|
| Description of processing | What data, who processes it, how long, what tools (Tink, Supabase Edge Functions) |
| Necessity & proportionality | Why bank data is needed, why 90-day fetch window, why 30-day retention |
| Risks to data subjects | Unauthorized access to financial data, data breach, re-identification |
| Risk mitigation measures | RLS, encryption, least-privilege scopes, token storage security, Tink DPA |
| DPO consultation | If a DPO is appointed — consult before processing begins |

#### DPIA Owner & Deadline

- **Owner:** GOZE (data controller)
- **Deadline:** Before Story 7.1 starts
- **Format:** Internal document — does not need to be published, but must be retained

#### Action Item

- [ ] Complete DPIA document before Story 7.1
- [ ] Add DPIA to GDPR compliance checklist (section 7 below)

---

## 2. Data Processor Agreements

### Required DPAs

| Processor       | Role                                                           | DPA Status                                              |
| --------------- | -------------------------------------------------------------- | ------------------------------------------------------- |
| **Tink (Visa)** | AISP — accesses bank data on behalf of user                    | ✅ Tink provides standard DPA (review before Story 7.1) |
| **Supabase**    | Infrastructure — stores connection data, tokens, detected subs | ✅ Supabase DPA already in place (Epic 1)               |
| **Expo / EAS**  | Build service — no access to bank data at runtime              | ✅ No additional DPA needed for bank data               |

### Action Item: Review Tink DPA

Before Story 7.1:

- [ ] Download Tink's standard DPA from Tink Console
- [ ] Verify EU data residency guarantees
- [ ] Confirm sub-processor list includes only EU/adequate-country entities
- [ ] Verify data breach notification timeline (must be ≤ 72 hours per GDPR Art. 33)

---

## 3. Apple App Store Requirements

### App Privacy Labels Update

SubTrack's App Store privacy label must be updated to include bank data types:

| Data Type                                | Category       | Linked to Identity | Used for Tracking |
| ---------------------------------------- | -------------- | ------------------ | ----------------- |
| **Financial Info — Bank Account**        | Financial Info | Yes                | No                |
| **Financial Info — Transaction History** | Financial Info | Yes                | No                |
| **Financial Info — Credit/Debit Card**   | Not collected  | —                  | —                 |

### Privacy Label Exemption Check

Apple allows exemption from disclosing financial data if:

> "Data types collected by apps facilitating regulated financial services, where collection is in accordance with a legally required privacy notice under applicable financial services or data protection laws"

**SubTrack does NOT qualify for this exemption** — SubTrack is not a regulated financial service. SubTrack is a subscription tracker that uses open banking data. All financial data types must be fully disclosed.

### App Store Review Guidelines — Financial Features

| Guideline                         | SubTrack Compliance                                                                          |
| --------------------------------- | -------------------------------------------------------------------------------------------- |
| 5.1.1 Data Collection and Storage | Must disclose all financial data collected                                                   |
| 5.1.2 Data Use and Sharing        | Tink listed as third-party data processor                                                    |
| 5.2.3 Financial Apps              | SubTrack is not a financial app (no payments, lending, or banking) — but uses financial data |
| Privacy Policy URL                | Must be updated to include bank data processing                                              |

### Privacy Manifest (NSPrivacyAccessedAPITypes)

Review whether `react-native-tink-sdk` declares any required reason APIs. If so, include in SubTrack's privacy manifest.

- [ ] Check Tink SDK's `PrivacyInfo.xcprivacy` file after installation
- [ ] Add any declared API types to SubTrack's privacy manifest

---

## 4. Google Play Store Requirements

### Data Safety Section Update

Update Play Console Data Safety form:

| Data Type                                 | Collected        | Shared     | Purpose                                    |
| ----------------------------------------- | ---------------- | ---------- | ------------------------------------------ |
| **Financial info — User payment info**    | Not collected    | —          | —                                          |
| **Financial info — Purchase history**     | Not collected    | —          | —                                          |
| **Financial info — Other financial info** | ✅ Collected     | Not shared | App functionality — subscription detection |
| **Personal info — Name**                  | Already declared | —          | —                                          |
| **Personal info — Email**                 | Already declared | —          | —                                          |

### Financial Features Declaration

Google Play requires completing the **Financial Features Declaration** form:

| Question                                  | Answer                                                         |
| ----------------------------------------- | -------------------------------------------------------------- |
| Does your app offer financial features?   | **Yes** — accesses bank account data for subscription tracking |
| Is your app a personal loan app?          | **No**                                                         |
| Does your app offer payment services?     | **No**                                                         |
| Does your app access user's bank account? | **Yes** — via Tink (licensed AISP), read-only access           |

**Action:** Complete Financial Features Declaration in Play Console before submitting Epic 7 update.

### Data Deletion Requirements

Google Play requires apps that collect user data to:

- Provide a way to request data deletion (already implemented — "Delete Account" in Settings)
- Include a web-based data deletion request option (link in privacy policy)

Bank data must be included in deletion scope.

---

## 5. Privacy Policy Updates

### Current Privacy Policy Scope

The existing privacy policy covers:

- Account data (email, name)
- Subscription data (user-entered)
- Notification preferences
- Analytics (anonymous)

### Required Additions for Epic 7

The privacy policy must be updated with a new section:

#### "Bank Account Data" Section — Required Content

| Topic                    | Content                                                                                                                            |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| **What we collect**      | Bank account metadata (account name, institution), transaction data (amount, description, date, category)                          |
| **How we collect it**    | Via Tink, a Visa-licensed open banking service. You authenticate directly with your bank. We never see your bank login credentials |
| **Why we collect it**    | To automatically detect recurring subscriptions from your transaction history                                                      |
| **How long we keep it**  | Raw transaction data: 30 days. Detected subscriptions: until you delete them or your account                                       |
| **Who we share it with** | Tink (Visa) processes your bank connection. Supabase stores your data in EU (Frankfurt). No other third parties                    |
| **Your rights**          | Disconnect bank at any time. Request deletion of all bank data. Export your data. All GDPR rights apply                            |
| **Data security**        | Encrypted at rest and in transit. Row-level security ensures only you can access your data                                         |
| **Children's data**      | We do not knowingly collect financial data from users under 16                                                                     |

### Privacy Policy Update Timeline

- [ ] Draft updated privacy policy before Story 7.1
- [ ] Legal review (if applicable)
- [ ] Update in-app privacy policy link
- [ ] Update App Store privacy policy URL
- [ ] Update Play Console privacy policy URL

---

## 6. Security Requirements for Bank Data

| Requirement            | Implementation                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------ |
| Encryption at rest     | Supabase PostgreSQL with encryption. Tink tokens in encrypted column                 |
| Encryption in transit  | TLS 1.2+ for all API calls (Tink, Supabase)                                          |
| Row Level Security     | `bank_connections` and `detected_subscriptions` filtered by `user_id`                |
| Token storage          | Tink `client_secret` in Edge Function env only — never in client app                 |
| Access logging         | Log bank data access events for audit trail                                          |
| No client-side storage | Raw transaction data never stored in AsyncStorage or device                          |
| Credential isolation   | SubTrack never accesses or stores bank credentials — Tink handles all authentication |
| Breach notification    | If bank data breach detected: notify users within 72 hours (GDPR Art. 33)            |

---

## 7. Compliance Checklist — Before Story 7.1

### GDPR

- [ ] **DPIA completed (Art. 35) — mandatory before Story 7.1**
- [ ] In-app consent screen designed and approved
- [ ] Data processing record updated (Art. 30)
- [ ] Tink DPA reviewed and signed
- [ ] Data retention policy documented (30-day raw transactions)
- [ ] "Disconnect Bank" flow includes data deletion
- [ ] Data export updated to include bank-detected subscriptions

### App Store (Apple)

- [ ] Privacy labels updated with financial data types
- [ ] Privacy manifest reviewed for Tink SDK APIs
- [ ] Privacy policy URL updated

### Play Store (Google)

- [ ] Data Safety section updated
- [ ] Financial Features Declaration completed
- [ ] Privacy policy URL updated

### Privacy Policy

- [ ] "Bank Account Data" section drafted
- [ ] Legal review completed (if applicable)
- [ ] Published to all required locations (in-app, App Store, Play Store, website)

---

## Risk Assessment

| Risk                                        | Likelihood | Impact                | Mitigation                                    |
| ------------------------------------------- | ---------- | --------------------- | --------------------------------------------- |
| App Store rejection for privacy label gaps  | Medium     | High (blocks release) | Complete all privacy labels before submission |
| Play Store Financial Declaration missing    | Medium     | High (blocks updates) | Complete declaration proactively              |
| GDPR complaint from user about bank data    | Low        | High (regulatory)     | Robust consent flow, clear privacy policy     |
| Tink DPA terms conflict with SubTrack's use | Low        | Medium                | Review DPA early, negotiate if needed         |
| Bank data stored beyond retention period    | Low        | Medium                | Automated 30-day cleanup job in Edge Function |

---

## Research Sources

- [Apple — App Privacy Details](https://developer.apple.com/app-store/app-privacy-details/) — Privacy label requirements
- [Apple — User Privacy and Data Use](https://developer.apple.com/app-store/user-privacy-and-data-use/) — Data use guidelines
- [Google Play — Data Safety](https://help.adjust.com/en/article/google-play-data-safety) — Data safety section guide
- [Google Play — Developer Program Policy](https://support.google.com/googleplay/android-developer/answer/16810878?hl=en) — Financial features policy
- [Google Play — Financial Features Declaration (Oct 2025)](https://support.google.com/googleplay/android-developer/answer/16550159?hl=en) — Declaration requirement
- [EDPB — PSD2 & GDPR Guidelines](https://www.edpb.europa.eu/sites/default/files/files/file1/edpb_guidelines_202006_psd2_afterpublicconsultation_en.pdf) — Regulatory interplay
- [InnReg — GDPR for Financial Services](https://www.innreg.com/blog/gdpr-for-financial-services) — Best practices
- [SecurePrivacy — Financial Data Consent 2025](https://secureprivacy.ai/blog/financial-data-consent-management-2025) — Consent management
- [BigID — GDPR vs PSD2](https://bigid.com/blog/gdpr-vs-psd2-compliance/) — Compliance overlap
- [Cookie-Script — FinTech Sensitive Data 2026](https://cookie-script.com/guides/fintech-loan-apps-handling-sensitive-data-in-2026) — Data handling guide

---

_Research conducted as Epic 6 retrospective preparation task (P4)_
