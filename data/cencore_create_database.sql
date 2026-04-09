-- ============================================================
-- CENCORE Database Creation Script
-- Target Server: crg-sql.eei.local
-- Database:      CENCORE
-- Converted from: Supabase PostgreSQL schema
-- ============================================================

USE master;
GO

IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'CENCORE')
BEGIN
    CREATE DATABASE CENCORE
        COLLATE SQL_Latin1_General_CP1_CI_AS;
    PRINT 'Database CENCORE created.';
END
ELSE
    PRINT 'Database CENCORE already exists.';
GO

USE CENCORE;
GO

-- ============================================================
-- SECTION 1: AUTH / USER TABLE
-- Replaces Supabase auth.users
-- ============================================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'app_user')
CREATE TABLE dbo.app_user (
    id                   UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    email                NVARCHAR(255)    NOT NULL,
    password_hash        NVARCHAR(255)    NULL,
    email_confirmed_at   DATETIMEOFFSET   NULL,
    last_sign_in_at      DATETIMEOFFSET   NULL,
    is_active            BIT              NOT NULL DEFAULT 1,
    raw_user_meta_data   NVARCHAR(MAX)    NULL,   -- JSON
    created_at           DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    updated_at           DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT PK_app_user PRIMARY KEY (id),
    CONSTRAINT UQ_app_user_email UNIQUE (email)
);
GO

-- ============================================================
-- SECTION 2: TENANT
-- ============================================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'tenant')
CREATE TABLE dbo.tenant (
    tenant_id                UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    name                     NVARCHAR(255)    NOT NULL,
    domain                   NVARCHAR(255)    NULL,
    plan_type                NVARCHAR(50)     NULL DEFAULT 'free',
    is_active                BIT              NOT NULL DEFAULT 1,
    microsoft_client_id      NVARCHAR(MAX)    NULL,
    microsoft_client_secret  NVARCHAR(MAX)    NULL,
    microsoft_tenant_id      NVARCHAR(MAX)    NULL DEFAULT 'common',
    microsoft_redirect_uri   NVARCHAR(MAX)    NULL,
    default_hourly_rate      DECIMAL(10,2)    NULL DEFAULT 85,
    created_at               DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    updated_at               DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT PK_tenant PRIMARY KEY (tenant_id)
);
GO

-- ============================================================
-- SECTION 3: PROFILE (linked to app_user)
-- ============================================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'profile')
CREATE TABLE dbo.profile (
    id          UNIQUEIDENTIFIER NOT NULL,
    tenant_id   UNIQUEIDENTIFIER NOT NULL,
    first_name  NVARCHAR(100)    NULL,
    last_name   NVARCHAR(100)    NULL,
    phone       NVARCHAR(50)     NULL,
    is_active   BIT              NOT NULL DEFAULT 1,
    created_at  DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    updated_at  DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT PK_profile PRIMARY KEY (id),
    CONSTRAINT FK_profile_app_user  FOREIGN KEY (id)        REFERENCES dbo.app_user (id)  ON DELETE CASCADE,
    CONSTRAINT FK_profile_tenant    FOREIGN KEY (tenant_id) REFERENCES dbo.tenant (tenant_id)
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_profile_tenant' AND object_id = OBJECT_ID('dbo.profile'))
    CREATE INDEX IX_profile_tenant ON dbo.profile (tenant_id);
GO

-- ============================================================
-- SECTION 4: USER_ROLE
-- ============================================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'user_role')
CREATE TABLE dbo.user_role (
    id          UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    user_id     UNIQUEIDENTIFIER NOT NULL,
    tenant_id   UNIQUEIDENTIFIER NOT NULL,
    role        NVARCHAR(50)     NOT NULL DEFAULT 'user',
    created_at  DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT PK_user_role PRIMARY KEY (id),
    CONSTRAINT FK_user_role_profile FOREIGN KEY (user_id)   REFERENCES dbo.profile (id)   ON DELETE CASCADE,
    CONSTRAINT FK_user_role_tenant  FOREIGN KEY (tenant_id) REFERENCES dbo.tenant (tenant_id),
    CONSTRAINT UQ_user_role         UNIQUE (user_id, tenant_id, role),
    CONSTRAINT CK_user_role_role    CHECK (role IN ('admin','manager','user','client','finance','marketing','sales','hr','operations','contractor'))
);
GO

-- ============================================================
-- SECTION 5: LEAD
-- ============================================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'lead')
CREATE TABLE dbo.lead (
    lead_id              UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    tenant_id            UNIQUEIDENTIFIER NOT NULL,
    owner_user_id        UNIQUEIDENTIFIER NULL,
    first_name           NVARCHAR(100)    NULL,
    last_name            NVARCHAR(100)    NULL,
    company_name         NVARCHAR(255)    NULL,
    email                NVARCHAR(255)    NULL,
    phone                NVARCHAR(50)     NULL,
    status               NVARCHAR(50)     NULL DEFAULT 'New',
    lead_source          NVARCHAR(100)    NULL,
    lead_number          NVARCHAR(50)     NULL,
    converted_account_id UNIQUEIDENTIFIER NULL,
    converted_contact_id UNIQUEIDENTIFIER NULL,
    converted_at         DATETIMEOFFSET   NULL,
    created_at           DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    updated_at           DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT PK_lead PRIMARY KEY (lead_id),
    CONSTRAINT FK_lead_tenant     FOREIGN KEY (tenant_id)     REFERENCES dbo.tenant  (tenant_id),
    CONSTRAINT FK_lead_owner_user FOREIGN KEY (owner_user_id) REFERENCES dbo.profile (id)
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_lead_tenant' AND object_id = OBJECT_ID('dbo.lead'))
    CREATE INDEX IX_lead_tenant ON dbo.lead (tenant_id);
GO

-- ============================================================
-- SECTION 6: ACCOUNT
-- ============================================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'account')
CREATE TABLE dbo.account (
    account_id                          UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    tenant_id                           UNIQUEIDENTIFIER NOT NULL,
    name                                NVARCHAR(255)    NOT NULL,
    account_number                      NVARCHAR(50)     NULL,
    type                                NVARCHAR(50)     NULL DEFAULT 'Customer',
    industry                            NVARCHAR(100)    NULL,
    website                             NVARCHAR(255)    NULL,
    phone                               NVARCHAR(50)     NULL,
    fax                                 NVARCHAR(50)     NULL,
    description                         NVARCHAR(MAX)    NULL,
    status                              NVARCHAR(50)     NULL DEFAULT 'Active',
    status_reason                       NVARCHAR(255)    NULL,
    sales_status                        NVARCHAR(100)    NULL,
    contract_status                     NVARCHAR(100)    NULL,
    org_type                            NVARCHAR(100)    NULL,
    org_record_type                     NVARCHAR(100)    NULL,
    -- Address
    billing_address                     NVARCHAR(MAX)    NULL,
    billing_street                      NVARCHAR(255)    NULL,
    billing_city                        NVARCHAR(100)    NULL,
    billing_state                       NVARCHAR(100)    NULL,
    billing_postal_code                 NVARCHAR(20)     NULL,
    billing_country                     NVARCHAR(100)    NULL,
    billing_email                       NVARCHAR(255)    NULL,
    mailing_address                     NVARCHAR(MAX)    NULL,
    physical_address                    NVARCHAR(MAX)    NULL,
    shipping_street                     NVARCHAR(255)    NULL,
    shipping_city                       NVARCHAR(100)    NULL,
    shipping_state                      NVARCHAR(100)    NULL,
    shipping_postal_code                NVARCHAR(20)     NULL,
    shipping_country                    NVARCHAR(100)    NULL,
    -- Financial
    annual_revenue                      DECIMAL(18,2)    NULL,
    annual_revenue_raw                  NVARCHAR(100)    NULL,
    est_annual_expenditures             DECIMAL(18,2)    NULL,
    minimum_utility_spend               DECIMAL(18,2)    NULL,
    cost_per_student                    DECIMAL(18,2)    NULL,
    cost_per_student_raw                NVARCHAR(100)    NULL,
    membership_enrollment               DECIMAL(18,2)    NULL,
    total_gross_square_feet             DECIMAL(18,2)    NULL,
    number_of_employees                 INT              NULL,
    -- Flags
    faith_based                         BIT              NULL,
    key_reference                       BIT              NULL,
    push_to_d365                        BIT              NULL,
    -- Misc
    ownership                           NVARCHAR(100)    NULL,
    rating                              NVARCHAR(50)     NULL,
    sic                                 NVARCHAR(50)     NULL,
    sic_desc                            NVARCHAR(255)    NULL,
    site                                NVARCHAR(255)    NULL,
    ticker_symbol                       NVARCHAR(50)     NULL,
    account_source                      NVARCHAR(100)    NULL,
    prospect_data_source                NVARCHAR(255)    NULL,
    association                         NVARCHAR(255)    NULL,
    legal_name                          NVARCHAR(255)    NULL,
    invoice_delivery                    NVARCHAR(100)    NULL,
    po_number                           NVARCHAR(100)    NULL,
    -- Internal
    gl_revenue_account                  NVARCHAR(100)    NULL,
    tk_gl_expense_account               NVARCHAR(100)    NULL,
    sharepoint_path                     NVARCHAR(MAX)    NULL,
    ecap_api_token                      NVARCHAR(MAX)    NULL,
    portal_org_id                       NVARCHAR(100)    NULL,
    client_id                           NVARCHAR(100)    NULL,
    aha_account_number                  NVARCHAR(100)    NULL,
    record_identification_code          NVARCHAR(100)    NULL,
    -- Relationships
    owner_user_id                       UNIQUEIDENTIFIER NULL,
    owner_user_id_2                     UNIQUEIDENTIFIER NULL,
    market_consultant_id                UNIQUEIDENTIFIER NULL,
    original_lead_id                    UNIQUEIDENTIFIER NULL,
    parent_account_id                   UNIQUEIDENTIFIER NULL,
    current_energy_program_id           UNIQUEIDENTIFIER NULL,
    -- Energy program
    current_energy_program_salesforce_id NVARCHAR(255)   NULL,
    -- Business Central
    bc_id                               UNIQUEIDENTIFIER NULL,
    bc_number                           NVARCHAR(100)    NULL,
    bc_sync_status                      NVARCHAR(50)     NULL DEFAULT 'pending',
    bc_last_synced_at                   DATETIMEOFFSET   NULL,
    bc_posting_group                    NVARCHAR(100)    NULL DEFAULT 'EXTERNAL',
    -- Dynamics 365
    d365_account_guid                   NVARCHAR(100)    NULL,
    d365_parent_account_guid            NVARCHAR(100)    NULL,
    -- Salesforce
    salesforce_id                       NVARCHAR(255)    NULL,
    salesforce_parent_id                NVARCHAR(255)    NULL,
    salesforce_owner_id                 NVARCHAR(255)    NULL,
    salesforce_record_type_id           NVARCHAR(255)    NULL,
    market_consultant_salesforce_id     NVARCHAR(255)    NULL,
    market_consultant_2_salesforce_id   NVARCHAR(255)    NULL,
    owner_user_2_salesforce_id          NVARCHAR(255)    NULL,
    -- Timestamps
    created_at  DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    updated_at  DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT PK_account PRIMARY KEY (account_id),
    CONSTRAINT FK_account_tenant            FOREIGN KEY (tenant_id)          REFERENCES dbo.tenant  (tenant_id),
    CONSTRAINT FK_account_owner_user        FOREIGN KEY (owner_user_id)      REFERENCES dbo.profile (id),
    CONSTRAINT FK_account_owner_user_2      FOREIGN KEY (owner_user_id_2)    REFERENCES dbo.profile (id),
    CONSTRAINT FK_account_market_consultant FOREIGN KEY (market_consultant_id) REFERENCES dbo.profile (id),
    CONSTRAINT FK_account_lead              FOREIGN KEY (original_lead_id)   REFERENCES dbo.lead    (lead_id),
    CONSTRAINT FK_account_parent            FOREIGN KEY (parent_account_id)  REFERENCES dbo.account (account_id)
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_account_tenant' AND object_id = OBJECT_ID('dbo.account'))
    CREATE INDEX IX_account_tenant ON dbo.account (tenant_id);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_account_salesforce_id' AND object_id = OBJECT_ID('dbo.account'))
    CREATE INDEX IX_account_salesforce_id ON dbo.account (salesforce_id) WHERE salesforce_id IS NOT NULL;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_account_parent' AND object_id = OBJECT_ID('dbo.account'))
    CREATE INDEX IX_account_parent ON dbo.account (salesforce_parent_id);
GO

-- ============================================================
-- SECTION 7: CONTACT
-- ============================================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'contact')
CREATE TABLE dbo.contact (
    contact_id                  UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    tenant_id                   UNIQUEIDENTIFIER NOT NULL,
    account_id                  UNIQUEIDENTIFIER NULL,
    salutation                  NVARCHAR(20)     NULL,
    first_name                  NVARCHAR(100)    NULL,
    middle_name                 NVARCHAR(100)    NULL,
    last_name                   NVARCHAR(100)    NULL,
    suffix                      NVARCHAR(50)     NULL,
    goes_by                     NVARCHAR(100)    NULL,
    title                       NVARCHAR(100)    NULL,
    department                  NVARCHAR(100)    NULL,
    email                       NVARCHAR(255)    NULL,
    personal_email              NVARCHAR(255)    NULL,
    additional_email            NVARCHAR(255)    NULL,
    asst_email                  NVARCHAR(255)    NULL,
    phone                       NVARCHAR(50)     NULL,
    mobile                      NVARCHAR(50)     NULL,
    home_phone                  NVARCHAR(50)     NULL,
    fax                         NVARCHAR(50)     NULL,
    mailing_address             NVARCHAR(MAX)    NULL,
    home_address                NVARCHAR(MAX)    NULL,
    birthdate                   DATE             NULL,
    description                 NVARCHAR(MAX)    NULL,
    contact_number              NVARCHAR(50)     NULL,
    contact_type                NVARCHAR(100)    NULL,
    status                      NVARCHAR(50)     NULL,
    status_reason               NVARCHAR(255)    NULL,
    sales_role                  NVARCHAR(100)    NULL,
    lead_source                 NVARCHAR(100)    NULL,
    preferred_contact_method    NVARCHAR(100)    NULL,
    -- Flags
    is_primary                  BIT              NULL DEFAULT 0,
    is_active                   BIT              NULL DEFAULT 1,
    key_reference               BIT              NULL,
    key_reference_date          DATE             NULL,
    -- Commission / recruitment
    mc_commission               NVARCHAR(MAX)    NULL,
    recruiter_commission        NVARCHAR(MAX)    NULL,
    commission_notes            NVARCHAR(MAX)    NULL,
    commission_split_total      DECIMAL(18,2)    NULL,
    agreement_notes             NVARCHAR(MAX)    NULL,
    reference_notes             NVARCHAR(MAX)    NULL,
    quota_over_goals            DECIMAL(18,2)    NULL,
    actual_from_goals           DECIMAL(18,2)    NULL,
    amount_over_quota           DECIMAL(18,2)    NULL,
    association                 NVARCHAR(255)    NULL,
    dallas_visit_date           DATE             NULL,
    internal_search_owner       NVARCHAR(255)    NULL,
    employee_id                 NVARCHAR(100)    NULL,
    aha_contact_number          NVARCHAR(100)    NULL,
    -- Relationships
    original_lead_id            UNIQUEIDENTIFIER NULL,
    recruited_by_user_id        UNIQUEIDENTIFIER NULL,
    -- Dynamics 365
    d365_contact_guid           NVARCHAR(100)    NULL,
    d365_parent_customer_guid   NVARCHAR(100)    NULL,
    -- Salesforce
    salesforce_id               NVARCHAR(255)    NULL,
    salesforce_account_id       NVARCHAR(255)    NULL,
    salesforce_owner_id         NVARCHAR(255)    NULL,
    -- Timestamps
    created_at  DATETIMEOFFSET  NOT NULL DEFAULT GETUTCDATE(),
    updated_at  DATETIMEOFFSET  NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT PK_contact PRIMARY KEY (contact_id),
    CONSTRAINT FK_contact_tenant       FOREIGN KEY (tenant_id)          REFERENCES dbo.tenant  (tenant_id),
    CONSTRAINT FK_contact_account      FOREIGN KEY (account_id)         REFERENCES dbo.account (account_id),
    CONSTRAINT FK_contact_lead         FOREIGN KEY (original_lead_id)   REFERENCES dbo.lead    (lead_id),
    CONSTRAINT FK_contact_recruiter    FOREIGN KEY (recruited_by_user_id) REFERENCES dbo.profile (id)
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_contact_tenant' AND object_id = OBJECT_ID('dbo.contact'))
    CREATE INDEX IX_contact_tenant ON dbo.contact (tenant_id);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_contact_account' AND object_id = OBJECT_ID('dbo.contact'))
    CREATE INDEX IX_contact_account ON dbo.contact (account_id);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_contact_sf_id' AND object_id = OBJECT_ID('dbo.contact'))
    CREATE UNIQUE INDEX IX_contact_sf_id ON dbo.contact (salesforce_id) WHERE salesforce_id IS NOT NULL;
GO

-- Update lead FKs now that account & contact exist
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_lead_converted_account' AND parent_object_id = OBJECT_ID('dbo.lead'))
    ALTER TABLE dbo.lead ADD CONSTRAINT FK_lead_converted_account FOREIGN KEY (converted_account_id) REFERENCES dbo.account (account_id);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_lead_converted_contact' AND parent_object_id = OBJECT_ID('dbo.lead'))
    ALTER TABLE dbo.lead ADD CONSTRAINT FK_lead_converted_contact FOREIGN KEY (converted_contact_id) REFERENCES dbo.contact (contact_id);
GO

-- ============================================================
-- SECTION 8: OPPORTUNITY
-- ============================================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'opportunity')
CREATE TABLE dbo.opportunity (
    opportunity_id      UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    tenant_id           UNIQUEIDENTIFIER NOT NULL,
    account_id          UNIQUEIDENTIFIER NOT NULL,
    primary_contact_id  UNIQUEIDENTIFIER NULL,
    owner_user_id       UNIQUEIDENTIFIER NULL,
    original_lead_id    UNIQUEIDENTIFIER NULL,
    name                NVARCHAR(255)    NOT NULL,
    opportunity_number  NVARCHAR(50)     NULL,
    stage               NVARCHAR(50)     NULL DEFAULT 'Prospecting',
    amount              DECIMAL(15,2)    NULL,
    probability         INT              NULL,
    close_date          DATE             NULL,
    description         NVARCHAR(MAX)    NULL,
    created_at          DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    updated_at          DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT PK_opportunity PRIMARY KEY (opportunity_id),
    CONSTRAINT FK_opp_tenant   FOREIGN KEY (tenant_id)          REFERENCES dbo.tenant  (tenant_id),
    CONSTRAINT FK_opp_account  FOREIGN KEY (account_id)         REFERENCES dbo.account (account_id),
    CONSTRAINT FK_opp_contact  FOREIGN KEY (primary_contact_id) REFERENCES dbo.contact (contact_id),
    CONSTRAINT FK_opp_owner    FOREIGN KEY (owner_user_id)      REFERENCES dbo.profile (id),
    CONSTRAINT FK_opp_lead     FOREIGN KEY (original_lead_id)   REFERENCES dbo.lead    (lead_id),
    CONSTRAINT CK_opp_prob     CHECK (probability >= 0 AND probability <= 100)
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_opportunity_tenant' AND object_id = OBJECT_ID('dbo.opportunity'))
    CREATE INDEX IX_opportunity_tenant ON dbo.opportunity (tenant_id);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_opportunity_account' AND object_id = OBJECT_ID('dbo.opportunity'))
    CREATE INDEX IX_opportunity_account ON dbo.opportunity (account_id);
GO

-- ============================================================
-- SECTION 9: PRODUCT
-- ============================================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'product')
CREATE TABLE dbo.product (
    product_id      UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    tenant_id       UNIQUEIDENTIFIER NOT NULL,
    name            NVARCHAR(255)    NOT NULL,
    sku             NVARCHAR(100)    NULL,
    description     NVARCHAR(MAX)    NULL,
    unit_price      DECIMAL(15,2)    NULL,
    type            NVARCHAR(50)     NULL DEFAULT 'Service',
    bc_id           UNIQUEIDENTIFIER NULL,
    bc_number       NVARCHAR(100)    NULL,
    bc_sync_status  NVARCHAR(50)     NULL DEFAULT 'pending',
    bc_last_synced_at DATETIMEOFFSET NULL,
    created_at      DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    updated_at      DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT PK_product    PRIMARY KEY (product_id),
    CONSTRAINT FK_product_tenant FOREIGN KEY (tenant_id) REFERENCES dbo.tenant (tenant_id),
    CONSTRAINT UQ_product_sku    UNIQUE (tenant_id, sku)
);
GO

-- ============================================================
-- SECTION 10: QUOTE
-- ============================================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'quote')
CREATE TABLE dbo.quote (
    quote_id        UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    tenant_id       UNIQUEIDENTIFIER NOT NULL,
    opportunity_id  UNIQUEIDENTIFIER NOT NULL,
    quote_number    NVARCHAR(50)     NOT NULL,
    status          NVARCHAR(50)     NULL DEFAULT 'Draft',
    valid_until     DATE             NULL,
    total_amount    DECIMAL(15,2)    NULL,
    terms           NVARCHAR(MAX)    NULL,
    created_at      DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    updated_at      DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT PK_quote      PRIMARY KEY (quote_id),
    CONSTRAINT FK_quote_tenant FOREIGN KEY (tenant_id)      REFERENCES dbo.tenant      (tenant_id),
    CONSTRAINT FK_quote_opp   FOREIGN KEY (opportunity_id)  REFERENCES dbo.opportunity (opportunity_id),
    CONSTRAINT UQ_quote_number UNIQUE (tenant_id, quote_number)
);
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'quote_line')
CREATE TABLE dbo.quote_line (
    quote_line_id   UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    quote_id        UNIQUEIDENTIFIER NOT NULL,
    product_id      UNIQUEIDENTIFIER NULL,
    description     NVARCHAR(MAX)    NULL,
    quantity        DECIMAL(10,2)    NULL DEFAULT 1,
    unit_price      DECIMAL(15,2)    NULL,
    total_price     DECIMAL(15,2)    NULL,
    created_at      DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT PK_quote_line    PRIMARY KEY (quote_line_id),
    CONSTRAINT FK_qline_quote   FOREIGN KEY (quote_id)   REFERENCES dbo.quote   (quote_id) ON DELETE CASCADE,
    CONSTRAINT FK_qline_product FOREIGN KEY (product_id) REFERENCES dbo.product (product_id)
);
GO

-- ============================================================
-- SECTION 10b: MEASURE
-- Source: Measure__c.object
-- ============================================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'measure')
CREATE TABLE dbo.measure (
    measure_id              UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    tenant_id               UNIQUEIDENTIFIER NOT NULL,
    account_id              UNIQUEIDENTIFIER NULL,   -- Org__c → Account
    name                    NVARCHAR(255)    NULL,   -- nameField (AutoNumber)
    c360_account_id         NVARCHAR(255)    NULL,   -- C360AccountID__c
    c360_measure_id         NVARCHAR(255)    NULL,   -- C360MeasureID__c
    conversion_bill_period  NVARCHAR(255)    NULL,   -- Conversion_Bill_Period__c
    conversion_date         DATETIMEOFFSET   NULL,   -- Conversion_Date__c
    measure_program_id      NVARCHAR(255)    NULL,   -- Measure_Program_ID__c
    salesforce_id           NVARCHAR(255)    NULL,
    salesforce_raw          NVARCHAR(MAX)    NULL,   -- JSON
    created_at              DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    updated_at              DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT PK_measure        PRIMARY KEY (measure_id),
    CONSTRAINT FK_measure_tenant FOREIGN KEY (tenant_id)  REFERENCES dbo.tenant  (tenant_id),
    CONSTRAINT FK_measure_acct   FOREIGN KEY (account_id) REFERENCES dbo.account (account_id)
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_measure_sf_id' AND object_id = OBJECT_ID('dbo.measure'))
    CREATE UNIQUE INDEX IX_measure_sf_id ON dbo.measure (salesforce_id) WHERE salesforce_id IS NOT NULL;
GO

-- ============================================================
-- SECTION 10c: ENERGY_PROGRAM
-- Source: Energy_Program__c.object
-- ============================================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'energy_program')
CREATE TABLE dbo.energy_program (
    energy_program_id           UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    tenant_id                   UNIQUEIDENTIFIER NOT NULL,
    account_id                  UNIQUEIDENTIFIER NULL,   -- Organization__c → Account
    opportunity_id              UNIQUEIDENTIFIER NULL,   -- Related_Opportunity__c → Opportunity
    measure_id                  UNIQUEIDENTIFIER NULL,   -- Related_Measure__c → Measure__c

    -- Name / identifiers
    name                        NVARCHAR(255)    NULL,   -- nameField
    pgm_id                      NVARCHAR(50)     NULL,   -- pgmId__c
    d365_energy_program_guid    NVARCHAR(50)     NULL,   -- D365EnergyProgramGuid__c
    sharepoint_path             NVARCHAR(MAX)    NULL,   -- SharePoint_Path__c
    ecap_online_owner_id        NVARCHAR(255)    NULL,   -- ECAP_Online_Owner_ID__c

    -- Status / service
    service_status              NVARCHAR(50)     NULL,   -- Service_Status__c: IC | OOC | Suspended | Terminated | Draft | Inactive
    status                      NVARCHAR(50)     NULL,   -- Status__c

    -- Contract / billing dates
    contract_start_date         DATE             NULL,   -- Contract_Start_Date__c
    billing_schedule_end_date   DATE             NULL,   -- Billing_Schedule_End_Date__c
    data_released               DATE             NULL,   -- Data_Released__c
    sus_term_date               DATE             NULL,   -- Sus_Term_Date__c

    -- Contract type / term
    contract_status             NVARCHAR(50)     NULL,   -- Contract_Status__c: Draft | Active | Expired | Terminated | Closed Lost | Inactive | Negotiation | Signed | Signed/Not Executed
    contract_type               NVARCHAR(50)     NULL,   -- Contract_Type__c: Fixed | Fixed-ES | Var Fixed | Var Fixed-ES | Split Fee | Performance Fee | Turnkey | Turnkey-R | Turnkey-S
    contract_term               DECIMAL(10,2)    NULL,   -- Contract_Term__c

    -- Flags
    push_to_d365                BIT              NULL DEFAULT 0,   -- Push_to_D365__c
    send_contacts               BIT              NULL DEFAULT 0,   -- Send_Contacts__c
    executive_app_includes_qs   BIT              NULL DEFAULT 0,   -- Executive_app_includes_QS__c

    -- Notes / text
    ct_hot_notes                NVARCHAR(2000)   NULL,   -- CT_HotNotes__c
    key_reference_notes         NVARCHAR(MAX)    NULL,   -- Key_Reference_Notes__c
    key_reference               NVARCHAR(50)     NULL,   -- Key_Reference__c
    sus_term_info               NVARCHAR(MAX)    NULL,   -- Sus_Term_Info__c
    sus_term_reason             NVARCHAR(MAX)    NULL,   -- Sus_Term_Reason__c
    pma_user_id                 NVARCHAR(255)    NULL,   -- PMA_User_Id__c
    pma_password                NVARCHAR(255)    NULL,   -- PMA_Password__c

    -- Team member SF IDs (denormalized; team members in energy_program_team_member)
    client_manager_sf_user_id         NVARCHAR(255)    NULL,   -- Client_Manager__c → User
    gx_lead_sf_user_id                NVARCHAR(255)    NULL,   -- GX_Lead__c → User
    implementation_consultant_sf_id   NVARCHAR(255)    NULL,   -- Implementation_Consultant__c → User
    implementation_consultant2_sf_id  NVARCHAR(255)    NULL,   -- Implementation_Consultant_2__c → User
    mv_lead_sf_user_id                NVARCHAR(255)    NULL,   -- M_V_Lead__c → User
    technical_lead_sf_user_id         NVARCHAR(255)    NULL,   -- Technical_Lead__c → User
    technical_lead2_sf_user_id        NVARCHAR(255)    NULL,   -- Technical_Lead_2__c → User

    -- Related contract (stored as SF id to avoid circular FK with contract table)
    related_contract_sf_id      NVARCHAR(255)    NULL,   -- Related_Contract__c SF id

    -- External IDs
    salesforce_id               NVARCHAR(255)    NULL,
    salesforce_account_id       NVARCHAR(255)    NULL,
    salesforce_opportunity_id   NVARCHAR(255)    NULL,
    salesforce_raw              NVARCHAR(MAX)    NULL,   -- JSON
    created_at                  DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    updated_at                  DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),

    CONSTRAINT PK_energy_program        PRIMARY KEY (energy_program_id),
    CONSTRAINT FK_ep_tenant             FOREIGN KEY (tenant_id)       REFERENCES dbo.tenant      (tenant_id),
    CONSTRAINT FK_ep_account            FOREIGN KEY (account_id)      REFERENCES dbo.account     (account_id),
    CONSTRAINT FK_ep_opportunity        FOREIGN KEY (opportunity_id)  REFERENCES dbo.opportunity (opportunity_id),
    CONSTRAINT FK_ep_measure            FOREIGN KEY (measure_id)      REFERENCES dbo.measure     (measure_id),
    CONSTRAINT CK_ep_service_status     CHECK (service_status IN ('IC','OOC','Suspended','Terminated','Draft','Inactive')),
    CONSTRAINT CK_ep_contract_type      CHECK (contract_type IN ('Fixed','Fixed-ES','Var Fixed','Var Fixed-ES','Split Fee','Performance Fee','Turnkey','Turnkey-R','Turnkey-S'))
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ep_sf_id' AND object_id = OBJECT_ID('dbo.energy_program'))
    CREATE UNIQUE INDEX IX_ep_sf_id ON dbo.energy_program (salesforce_id) WHERE salesforce_id IS NOT NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ep_account_id' AND object_id = OBJECT_ID('dbo.energy_program'))
    CREATE INDEX IX_ep_account_id ON dbo.energy_program (account_id);
GO

-- ============================================================
-- SECTION 11: CONTRACT
-- Source: Contract_CEN__c.object
-- ============================================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'contract')
CREATE TABLE dbo.contract (
    contract_id                     UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    tenant_id                       UNIQUEIDENTIFIER NOT NULL,
    account_id                      UNIQUEIDENTIFIER NULL,
    opportunity_id                  UNIQUEIDENTIFIER NULL,
    energy_program_id               UNIQUEIDENTIFIER NULL,   -- Energy_Program__c → energy_program
    parent_contract_id              UNIQUEIDENTIFIER NULL,   -- Contract__c (self-ref for addendums)

    -- Identifiers / name
    name                            NVARCHAR(255)    NULL,   -- nameField
    contract_number                 NVARCHAR(50)     NULL,   -- system number
    accounting_id                   NVARCHAR(6)      NULL,   -- Accounting_ID__c
    unique_contract_id              NVARCHAR(100)    NULL,   -- Unique_Contract_ID__c
    contract_fiscal_year            NVARCHAR(10)     NULL,   -- Contract_Fiscal_Year__c

    -- Type / classification
    type                            NVARCHAR(50)     NULL DEFAULT 'Contract',  -- Type__c: Contract | Addendum
    contract_type                   NVARCHAR(50)     NULL,   -- Contract_Type__c: Fixed | Fixed-ES | Var Fixed | Var Fixed-ES | Split Fee | Performance Fee | Turnkey | Turnkey-R | Turnkey-S
    addendum_type                   NVARCHAR(50)     NULL,   -- Addendum_Type__c
    software_type                   NVARCHAR(50)     NULL,   -- Software_Type__c: Measure | ECAP
    billing_cycle                   NVARCHAR(50)     NULL,   -- Billing_Cycle__c: Monthly | Quarterly | Annually

    -- Status
    status                          NVARCHAR(50)     NULL DEFAULT 'Draft',  -- internal/generic
    contract_status                 NVARCHAR(50)     NULL,   -- Contract_Status__c: Draft | Active | Expired | Terminated | Closed Lost | Inactive | Negotiation | Signed | Signed/Not Executed

    -- Dates
    start_date                      DATE             NULL,   -- Contract_Start_Date__c
    end_date                        DATE             NULL,
    base_year_start                 DATE             NULL,   -- Base_Year_Start__c
    base_year_end                   DATE             NULL,   -- Base_Year_End__c
    billing_start_date              DATE             NULL,   -- Billing_Start_Date__c
    billing_schedule_end_date       DATE             NULL,   -- Billing_Schedule_End_Date__c
    addendum_effective_date         DATE             NULL,   -- Addendum_Effective_Date__c
    company_signed_date             DATE             NULL,   -- Company_SIgned_Date__c
    customer_signed_date            DATE             NULL,   -- Customer_Signed_Date__c
    auto_renew_trigger_date         DATE             NULL,   -- Auto_Renew_Trigger_Date__c
    auto_renew_cancelation_deadline DATE             NULL,   -- Auto_Renew_Cancelation_Deadline__c

    -- Terms / financials
    contract_term                   INT              NULL,   -- Contract_Term__c (months)
    billable_term                   DECIMAL(10,2)    NULL,   -- Billable_Term__c
    billing_term_calc               DECIMAL(10,2)    NULL,   -- Billing_Term_Calc__c
    value                           DECIMAL(15,2)    NULL,
    simulate_annual_allocation      DECIMAL(18,2)    NULL,   -- Simulate_Annual_Allocation__c
    estimated_net_total_cv          DECIMAL(18,2)    NULL,   -- Estimated_Net_Total_Contract_Value_Calc__c
    discount                        DECIMAL(10,4)    NULL,   -- Discount__c
    ecap_maintenance_fee            DECIMAL(18,2)    NULL,   -- eCAP_Maintenance_Fee__c
    ecap_software_fee               DECIMAL(18,2)    NULL,   -- eCAP_Software_Fee__c
    client_specified_es_salary      DECIMAL(18,2)    NULL,   -- Client_Specified_ES_Salary__c
    es_salary_recommendation        DECIMAL(18,2)    NULL,   -- ES_Salary_Recommendation__c

    -- Gross savings by year
    year_1_gross_savings            DECIMAL(18,2)    NULL,
    year_2_gross_savings            DECIMAL(18,2)    NULL,
    year_3_gross_savings            DECIMAL(18,2)    NULL,
    year_4_gross_savings            DECIMAL(18,2)    NULL,
    year_5_gross_savings            DECIMAL(18,2)    NULL,
    year_6_gross_savings            DECIMAL(18,2)    NULL,
    year_7_gross_savings            DECIMAL(18,2)    NULL,
    year_8_gross_savings            DECIMAL(18,2)    NULL,
    year_9_gross_savings            DECIMAL(18,2)    NULL,
    year_10_gross_savings           DECIMAL(18,2)    NULL,

    -- Energy Specialist staffing
    es_employed_by                  NVARCHAR(50)     NULL,   -- ES_Employed_By__c: Client | Cenergistic
    es_ft                           INT              NULL,   -- ES_FT__c
    es_pt                           INT              NULL,   -- ES_PT__c
    total_ess                       INT              NULL,   -- Total_ESs__c
    visits_per_month                INT              NULL,   -- Visits_per_Month__c

    -- Renewal
    auto_renew                      NVARCHAR(50)     NULL,   -- Auto_Renew__c
    auto_renew_declined             BIT              NULL DEFAULT 0,
    renewal                         NVARCHAR(50)     NULL,   -- Renewal__c
    renewal_declined                BIT              NULL DEFAULT 0,
    renewal_opportunity_id          UNIQUEIDENTIFIER NULL,   -- Renewal_Opportunity__c

    -- Signing contacts (stored as FK and SF id)
    company_signed_by_sf_user_id    NVARCHAR(255)    NULL,   -- Company_Signed_By__c → User
    customer_signed_by_contact_id   UNIQUEIDENTIFIER NULL,   -- Customer_Signed_By__c → Contact

    -- Notes / text
    terms                           NVARCHAR(MAX)    NULL,
    accounting_changes_notes        NVARCHAR(MAX)    NULL,   -- Accounting_Changes_Notes__c
    si_special_requirements         NVARCHAR(MAX)    NULL,   -- SI_Special_Requirements__c
    special_dates_comments          NVARCHAR(MAX)    NULL,   -- Special_Dates_Comments__c
    unique_special_provisions       NVARCHAR(MAX)    NULL,   -- Unique_Special_Provisions__c (HTML)
    sharepoint_path                 NVARCHAR(MAX)    NULL,   -- SharePoint_Path__c

    -- External IDs
    d365_contract_guid              NVARCHAR(50)     NULL,   -- D365ContractGuid__c
    salesforce_id                   NVARCHAR(255)    NULL,
    salesforce_account_id           NVARCHAR(255)    NULL,
    salesforce_opportunity_id       NVARCHAR(255)    NULL,
    salesforce_energy_program_id    NVARCHAR(255)    NULL,
    salesforce_raw                  NVARCHAR(MAX)    NULL,   -- JSON
    created_at                      DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    updated_at                      DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),

    CONSTRAINT PK_contract              PRIMARY KEY (contract_id),
    CONSTRAINT FK_contract_tenant       FOREIGN KEY (tenant_id)           REFERENCES dbo.tenant         (tenant_id),
    CONSTRAINT FK_contract_acct         FOREIGN KEY (account_id)          REFERENCES dbo.account        (account_id),
    CONSTRAINT FK_contract_opp          FOREIGN KEY (opportunity_id)      REFERENCES dbo.opportunity    (opportunity_id),
    CONSTRAINT FK_contract_ep           FOREIGN KEY (energy_program_id)   REFERENCES dbo.energy_program (energy_program_id),
    CONSTRAINT FK_contract_parent       FOREIGN KEY (parent_contract_id)  REFERENCES dbo.contract       (contract_id),
    CONSTRAINT FK_contract_renewal_opp  FOREIGN KEY (renewal_opportunity_id) REFERENCES dbo.opportunity (opportunity_id),
    CONSTRAINT FK_contract_cust_signed  FOREIGN KEY (customer_signed_by_contact_id) REFERENCES dbo.contact (contact_id),
    CONSTRAINT CK_contract_type         CHECK (type IN ('Contract','Addendum')),
    CONSTRAINT CK_contract_billing_cyc  CHECK (billing_cycle IN ('Monthly','Quarterly','Annually'))
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_contract_sf_id' AND object_id = OBJECT_ID('dbo.contract'))
    CREATE UNIQUE INDEX IX_contract_sf_id ON dbo.contract (salesforce_id) WHERE salesforce_id IS NOT NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_contract_account_id' AND object_id = OBJECT_ID('dbo.contract'))
    CREATE INDEX IX_contract_account_id ON dbo.contract (account_id);
GO

-- ============================================================
-- SECTION 12: PROJECT
-- ============================================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'project')
CREATE TABLE dbo.project (
    project_id          UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    tenant_id           UNIQUEIDENTIFIER NOT NULL,
    account_id          UNIQUEIDENTIFIER NULL,
    owner_user_id       UNIQUEIDENTIFIER NULL,
    name                NVARCHAR(255)    NOT NULL,
    code                NVARCHAR(50)     NULL,
    description         NVARCHAR(MAX)    NULL,
    status              NVARCHAR(50)     NULL DEFAULT 'Planned',
    start_date          DATE             NULL,
    end_date            DATE             NULL,
    budget_hours        DECIMAL(10,2)    NULL,
    budget_amount       DECIMAL(15,2)    NULL,
    budget_cost         DECIMAL(15,2)    NULL,
    invoice_price       DECIMAL(15,2)    NULL,
    client_email        NVARCHAR(255)    NULL,
    bc_id               UNIQUEIDENTIFIER NULL,
    bc_number           NVARCHAR(100)    NULL,
    bc_sync_status      NVARCHAR(50)     NULL DEFAULT 'pending',
    bc_last_synced_at   DATETIMEOFFSET   NULL,
    created_at          DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    updated_at          DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT PK_project        PRIMARY KEY (project_id),
    CONSTRAINT FK_project_tenant FOREIGN KEY (tenant_id)    REFERENCES dbo.tenant  (tenant_id),
    CONSTRAINT FK_project_acct   FOREIGN KEY (account_id)   REFERENCES dbo.account (account_id),
    CONSTRAINT FK_project_owner  FOREIGN KEY (owner_user_id) REFERENCES dbo.profile (id),
    CONSTRAINT UQ_project_code   UNIQUE (tenant_id, code)
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_project_tenant' AND object_id = OBJECT_ID('dbo.project'))
    CREATE INDEX IX_project_tenant ON dbo.project (tenant_id);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_project_account' AND object_id = OBJECT_ID('dbo.project'))
    CREATE INDEX IX_project_account ON dbo.project (account_id);
GO

-- ============================================================
-- SECTION 13: TASK
-- ============================================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'task')
CREATE TABLE dbo.task (
    task_id                 UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    tenant_id               UNIQUEIDENTIFIER NOT NULL,
    project_id              UNIQUEIDENTIFIER NOT NULL,
    assigned_to_user_id     UNIQUEIDENTIFIER NULL,
    name                    NVARCHAR(255)    NOT NULL,
    description             NVARCHAR(MAX)    NULL,
    status                  NVARCHAR(50)     NULL DEFAULT 'Not Started',
    priority                NVARCHAR(20)     NULL DEFAULT 'Medium',
    task_type               NVARCHAR(50)     NULL,
    progress                INT              NULL DEFAULT 0,
    start_date              DATE             NULL,
    due_date                DATE             NULL,
    end_date                DATE             NULL,
    estimated_hours         DECIMAL(10,2)    NULL,
    budget_total_cost       DECIMAL(15,2)    NULL,
    actual_total_cost       DECIMAL(15,2)    NULL,
    billable_total_price    DECIMAL(15,2)    NULL,
    invoice_total_price     DECIMAL(15,2)    NULL,
    bc_job_id               UNIQUEIDENTIFIER NULL,
    bc_task_number          NVARCHAR(100)    NULL,
    bc_sync_status          NVARCHAR(50)     NULL DEFAULT 'pending',
    bc_last_synced_at       DATETIMEOFFSET   NULL,
    created_at              DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    updated_at              DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT PK_task        PRIMARY KEY (task_id),
    CONSTRAINT FK_task_tenant FOREIGN KEY (tenant_id)           REFERENCES dbo.tenant  (tenant_id),
    CONSTRAINT FK_task_proj   FOREIGN KEY (project_id)          REFERENCES dbo.project (project_id) ON DELETE CASCADE,
    CONSTRAINT FK_task_user   FOREIGN KEY (assigned_to_user_id) REFERENCES dbo.profile (id),
    CONSTRAINT CK_task_prog   CHECK (progress >= 0 AND progress <= 100)
);
GO

-- ============================================================
-- SECTION 14: SUPPORT_CASE
-- ============================================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'support_case')
CREATE TABLE dbo.support_case (
    case_id                 UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    tenant_id               UNIQUEIDENTIFIER NOT NULL,
    account_id              UNIQUEIDENTIFIER NULL,
    contact_id              UNIQUEIDENTIFIER NULL,
    owner_user_id           UNIQUEIDENTIFIER NULL,
    case_number             NVARCHAR(50)     NULL,
    subject                 NVARCHAR(255)    NOT NULL,
    description             NVARCHAR(MAX)    NULL,
    status                  NVARCHAR(50)     NOT NULL DEFAULT 'New',
    priority                NVARCHAR(50)     NOT NULL DEFAULT 'Normal',
    category                NVARCHAR(100)    NULL,
    origin                  NVARCHAR(50)     NULL DEFAULT 'Email',
    resolution              NVARCHAR(MAX)    NULL,
    resolved_at             DATETIMEOFFSET   NULL,
    email_thread_id         NVARCHAR(255)    NULL,
    email_conversation_id   NVARCHAR(255)    NULL,
    source_email            NVARCHAR(255)    NULL,
    created_at              DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    updated_at              DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT PK_support_case        PRIMARY KEY (case_id),
    CONSTRAINT FK_case_tenant         FOREIGN KEY (tenant_id)    REFERENCES dbo.tenant  (tenant_id),
    CONSTRAINT FK_case_account        FOREIGN KEY (account_id)   REFERENCES dbo.account (account_id),
    CONSTRAINT FK_case_contact        FOREIGN KEY (contact_id)   REFERENCES dbo.contact (contact_id),
    CONSTRAINT FK_case_owner          FOREIGN KEY (owner_user_id) REFERENCES dbo.profile (id)
);
GO

-- ============================================================
-- SECTION 15: TIMESHEET
-- ============================================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'timesheet')
CREATE TABLE dbo.timesheet (
    timesheet_id        UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    tenant_id           UNIQUEIDENTIFIER NOT NULL,
    user_id             UNIQUEIDENTIFIER NOT NULL,
    week_start          DATE             NOT NULL,
    week_end            DATE             NOT NULL,
    status              NVARCHAR(50)     NULL DEFAULT 'Open',
    submitted_at        DATETIMEOFFSET   NULL,
    approved_by_user_id UNIQUEIDENTIFIER NULL,
    approved_at         DATETIMEOFFSET   NULL,
    rejection_reason    NVARCHAR(MAX)    NULL,
    created_at          DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    updated_at          DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT PK_timesheet        PRIMARY KEY (timesheet_id),
    CONSTRAINT FK_timesheet_tenant FOREIGN KEY (tenant_id)           REFERENCES dbo.tenant  (tenant_id),
    CONSTRAINT FK_timesheet_user   FOREIGN KEY (user_id)             REFERENCES dbo.profile (id),
    CONSTRAINT FK_timesheet_approver FOREIGN KEY (approved_by_user_id) REFERENCES dbo.profile (id),
    CONSTRAINT UQ_timesheet        UNIQUE (tenant_id, user_id, week_start)
);
GO

-- ============================================================
-- SECTION 16: INVOICE
-- ============================================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'invoice')
CREATE TABLE dbo.invoice (
    -- Primary key / system fields
    invoice_id              UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    tenant_id               UNIQUEIDENTIFIER NOT NULL,
    account_id              UNIQUEIDENTIFIER NULL,
    contract_id             UNIQUEIDENTIFIER NULL,   -- Invoice_CEN__c.Contract__c → contract

    -- Salesforce name field (Invoice_CEN__c Name / Invoice_Name__c)
    name                    NVARCHAR(255)    NULL,
    invoice_name            NVARCHAR(80)     NULL,   -- Invoice_Name__c
    invoice_name_tk         NVARCHAR(25)     NULL,   -- Invoice_Name_TK__c (Intacct external id)
    invoice_number          NVARCHAR(50)     NULL,   -- internal invoice number
    invoice_sf_number       NVARCHAR(30)     NULL,   -- Invoice_ID__c (Salesforce/Intacct ID)
    item_id                 NVARCHAR(10)     NULL,   -- Item_ID__c (Intacct item ID)
    customer_id             NVARCHAR(10)     NULL,   -- Customerid__c (vendor/accounting ID)

    -- Document classification
    document_type           NVARCHAR(50)     NULL,   -- Invoice_CEN__c.Document_Type__c: Invoice | Credit Memo | Debit Memo

    -- Dates
    issue_date              DATE             NULL,
    due_date                DATE             NULL,   -- Due_Date__c
    bill_month              DATE             NULL,   -- Bill_Month__c
    post_date               DATE             NULL,   -- Post_Date__c
    scheduled_date          DATE             NULL,   -- Scheduled_Date__c (billing start date)
    cycle_end_date          DATE             NULL,   -- Cycle_End_Date__c (billing end date)
    date_delivered          DATE             NULL,   -- Date_Delivered__c
    applied_payment_date    DATE             NULL,   -- Applied_Payment_Date__c

    -- Financials
    contract_amount         DECIMAL(18,0)    NULL,   -- Contract_Amount__c
    invoice_total           DECIMAL(18,0)    NULL,   -- Invoice_Total__c
    applied_amount          DECIMAL(18,0)    NULL,   -- Applied_Amount__c
    subtotal_amount         DECIMAL(15,2)    NULL DEFAULT 0,
    tax_amount              DECIMAL(15,2)    NULL DEFAULT 0,
    total_amount            DECIMAL(15,2)    NULL DEFAULT 0,
    currency                NVARCHAR(3)      NULL DEFAULT 'USD',

    -- Status / workflow
    status                  NVARCHAR(50)     NULL DEFAULT 'Draft',
    intacct_status          NVARCHAR(50)     NULL,   -- Intacct_Status__c: Paid | Partially Paid | Open | Invoiced | Canceled | Scheduled | Voided | Posted | Reversal | Reversed | No Value
    intacct_state           NVARCHAR(50)     NULL,   -- Intacct_State__c: Pending | Closed
    billing_wizard          NVARCHAR(3)      NULL,   -- Billing_Wizard__c: Yes | No
    ready_for_billing       NVARCHAR(3)      NULL,   -- Ready_For_Billing__c: Yes | No
    run_reconciliation      NVARCHAR(3)      NULL,   -- Run_Reconciliation__c: Yes | No

    -- FK to energy_program (Energy_Program__c)
    energy_program_id       UNIQUEIDENTIFIER NULL,

    -- External IDs
    generated_external_id   NVARCHAR(50)     NULL,   -- Generated_External_ID__c (unique)
    salesforce_id           NVARCHAR(255)    NULL,
    salesforce_account_id   NVARCHAR(255)    NULL,
    salesforce_contract_id  NVARCHAR(255)    NULL,   -- Contract__c SF id
    salesforce_project_id   NVARCHAR(255)    NULL,
    salesforce_energy_program_id NVARCHAR(255) NULL, -- Energy_Program__c SF id
    d365_contract_id        NVARCHAR(255)    NULL,   -- D365Contractid__c
    d365_energy_program_id  NVARCHAR(255)    NULL,   -- D365EnergyProgramid__c
    crgbi_invoice_id        NVARCHAR(50)     NULL,   -- CRGBIInvoiceid__c
    legacy_source           NVARCHAR(10)     NULL,   -- Legacy_Source__c

    -- Business Central integration
    bc_id                   UNIQUEIDENTIFIER NULL,
    bc_number               NVARCHAR(100)    NULL,
    bc_sync_status          NVARCHAR(50)     NULL DEFAULT 'pending',
    bc_last_synced_at       DATETIMEOFFSET   NULL,

    -- Misc
    notes                   NVARCHAR(MAX)    NULL,
    description             NVARCHAR(MAX)    NULL,   -- Description__c
    salesforce_raw          NVARCHAR(MAX)    NULL,   -- JSON
    created_at              DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    updated_at              DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),

    CONSTRAINT PK_invoice             PRIMARY KEY (invoice_id),
    CONSTRAINT FK_invoice_tenant      FOREIGN KEY (tenant_id)          REFERENCES dbo.tenant         (tenant_id),
    CONSTRAINT FK_invoice_acct        FOREIGN KEY (account_id)         REFERENCES dbo.account        (account_id),
    CONSTRAINT FK_invoice_contract    FOREIGN KEY (contract_id)        REFERENCES dbo.contract       (contract_id),
    CONSTRAINT FK_invoice_ep          FOREIGN KEY (energy_program_id)  REFERENCES dbo.energy_program (energy_program_id),
    CONSTRAINT UQ_invoice_gen_ext_id  UNIQUE (generated_external_id),
    CONSTRAINT CK_invoice_doc_type    CHECK (document_type IN ('Invoice', 'Credit Memo', 'Debit Memo')),
    CONSTRAINT CK_invoice_intacct_status CHECK (intacct_status IN ('Paid','Partially Paid','Open','Invoiced','Canceled','Scheduled','Voided','Posted','Reversal','Reversed','No Value'))
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_invoice_sf_id' AND object_id = OBJECT_ID('dbo.invoice'))
    CREATE UNIQUE INDEX IX_invoice_sf_id ON dbo.invoice (salesforce_id) WHERE salesforce_id IS NOT NULL;
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'invoice_line')
CREATE TABLE dbo.invoice_line (
    invoice_line_id     UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    invoice_id          UNIQUEIDENTIFIER NOT NULL,
    project_id          UNIQUEIDENTIFIER NULL,
    product_id          UNIQUEIDENTIFIER NULL,
    time_entry_id       UNIQUEIDENTIFIER NULL,
    line_type           NVARCHAR(50)     NULL DEFAULT 'Service',
    description         NVARCHAR(MAX)    NULL,
    quantity            DECIMAL(10,2)    NULL DEFAULT 1,
    unit_price          DECIMAL(15,2)    NULL,
    total_price         DECIMAL(15,2)    NULL,
    created_at          DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT PK_invoice_line         PRIMARY KEY (invoice_line_id),
    CONSTRAINT FK_inv_line_invoice     FOREIGN KEY (invoice_id)  REFERENCES dbo.invoice (invoice_id) ON DELETE CASCADE,
    CONSTRAINT FK_inv_line_project     FOREIGN KEY (project_id)  REFERENCES dbo.project (project_id),
    CONSTRAINT FK_inv_line_product     FOREIGN KEY (product_id)  REFERENCES dbo.product (product_id)
);
GO

-- ============================================================
-- SECTION 17: TIME_ENTRY
-- ============================================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'time_entry')
CREATE TABLE dbo.time_entry (
    time_entry_id       UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    tenant_id           UNIQUEIDENTIFIER NOT NULL,
    user_id             UNIQUEIDENTIFIER NOT NULL,
    project_id          UNIQUEIDENTIFIER NULL,
    task_id             UNIQUEIDENTIFIER NULL,
    case_id             UNIQUEIDENTIFIER NULL,
    timesheet_id        UNIQUEIDENTIFIER NULL,
    invoice_line_id     UNIQUEIDENTIFIER NULL,
    approved_by_user_id UNIQUEIDENTIFIER NULL,
    [date]              DATE             NOT NULL,
    hours               DECIMAL(5,2)     NOT NULL,
    billable            BIT              NULL DEFAULT 1,
    hourly_rate         DECIMAL(10,2)    NULL,
    notes               NVARCHAR(MAX)    NULL,
    status              NVARCHAR(50)     NULL DEFAULT 'Draft',
    approved_at         DATETIMEOFFSET   NULL,
    rejection_notes     NVARCHAR(MAX)    NULL,
    start_time          DATETIMEOFFSET   NULL,
    end_time            DATETIMEOFFSET   NULL,
    is_running          BIT              NULL DEFAULT 0,
    entry_method        NVARCHAR(20)     NULL DEFAULT 'manual',
    created_at          DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    updated_at          DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT PK_time_entry            PRIMARY KEY (time_entry_id),
    CONSTRAINT FK_te_tenant             FOREIGN KEY (tenant_id)           REFERENCES dbo.tenant       (tenant_id),
    CONSTRAINT FK_te_user               FOREIGN KEY (user_id)             REFERENCES dbo.profile      (id),
    CONSTRAINT FK_te_project            FOREIGN KEY (project_id)          REFERENCES dbo.project      (project_id),
    CONSTRAINT FK_te_task               FOREIGN KEY (task_id)             REFERENCES dbo.task         (task_id),
    CONSTRAINT FK_te_case               FOREIGN KEY (case_id)             REFERENCES dbo.support_case (case_id),
    CONSTRAINT FK_te_timesheet          FOREIGN KEY (timesheet_id)        REFERENCES dbo.timesheet    (timesheet_id),
    CONSTRAINT FK_te_invoice_line       FOREIGN KEY (invoice_line_id)     REFERENCES dbo.invoice_line (invoice_line_id),
    CONSTRAINT FK_te_approver           FOREIGN KEY (approved_by_user_id) REFERENCES dbo.profile      (id),
    CONSTRAINT CK_te_entry_method       CHECK (entry_method IN ('timer','manual'))
);
GO

-- Add back-ref FK on invoice_line for time_entry (circular, add after both tables created)
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_inv_line_time_entry' AND parent_object_id = OBJECT_ID('dbo.invoice_line'))
    ALTER TABLE dbo.invoice_line ADD CONSTRAINT FK_inv_line_time_entry FOREIGN KEY (time_entry_id) REFERENCES dbo.time_entry (time_entry_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_time_entry_tenant' AND object_id = OBJECT_ID('dbo.time_entry'))
    CREATE INDEX IX_time_entry_tenant ON dbo.time_entry (tenant_id);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_time_entry_user' AND object_id = OBJECT_ID('dbo.time_entry'))
    CREATE INDEX IX_time_entry_user ON dbo.time_entry (user_id);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_time_entry_project' AND object_id = OBJECT_ID('dbo.time_entry'))
    CREATE INDEX IX_time_entry_project ON dbo.time_entry (project_id);
GO

-- ============================================================
-- SECTION 18: ACTIVITY
-- ============================================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'activity')
CREATE TABLE dbo.activity (
    activity_id                     UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    tenant_id                       UNIQUEIDENTIFIER NOT NULL,
    owner_user_id                   UNIQUEIDENTIFIER NULL,
    assigned_to_user_id             UNIQUEIDENTIFIER NULL,
    account_id                      UNIQUEIDENTIFIER NULL,
    contact_id                      UNIQUEIDENTIFIER NULL,
    lead_id                         UNIQUEIDENTIFIER NULL,
    opportunity_id                  UNIQUEIDENTIFIER NULL,
    quote_id                        UNIQUEIDENTIFIER NULL,
    contract_id                     UNIQUEIDENTIFIER NULL,
    case_id                         UNIQUEIDENTIFIER NULL,
    project_id                      UNIQUEIDENTIFIER NULL,
    type                            NVARCHAR(50)     NOT NULL,
    subject                         NVARCHAR(255)    NULL,
    description                     NVARCHAR(MAX)    NULL,
    activity_number                 NVARCHAR(50)     NULL,
    status                          NVARCHAR(50)     NULL DEFAULT 'Not Started',
    priority                        NVARCHAR(20)     NULL DEFAULT 'Normal',
    due_date                        DATE             NULL,
    start_datetime                  DATETIMEOFFSET   NULL,
    end_datetime                    DATETIMEOFFSET   NULL,
    completed_datetime              DATETIMEOFFSET   NULL,
    all_day_event                   BIT              NULL DEFAULT 0,
    duration_minutes                INT              NULL,
    location                        NVARCHAR(MAX)    NULL,
    is_closed                       BIT              NULL,
    to_email                        NVARCHAR(MAX)    NULL,
    cc_email                        NVARCHAR(MAX)    NULL,
    from_email                      NVARCHAR(MAX)    NULL,
    contact_method                  NVARCHAR(100)    NULL,
    visit_type                      NVARCHAR(100)    NULL,
    visit_length                    NVARCHAR(100)    NULL,
    sales_meeting_type              NVARCHAR(100)    NULL,
    alert_type                      NVARCHAR(100)    NULL,
    alert_details                   NVARCHAR(MAX)    NULL,
    number_of_attendees             INT              NULL,
    -- Salesforce
    salesforce_id                   NVARCHAR(255)    NULL,
    salesforce_account_id           NVARCHAR(255)    NULL,
    salesforce_contact_id           NVARCHAR(255)    NULL,
    salesforce_owner_id             NVARCHAR(255)    NULL,
    salesforce_opportunity_id       NVARCHAR(255)    NULL,
    salesforce_energy_program_id    NVARCHAR(255)    NULL,
    salesforce_organization_id      NVARCHAR(255)    NULL,
    salesforce_what_id              NVARCHAR(255)    NULL,
    salesforce_who_id               NVARCHAR(255)    NULL,
    salesforce_raw                  NVARCHAR(MAX)    NULL,  -- JSON
    -- Dynamics 365
    d365_activity_id                NVARCHAR(255)    NULL,
    created_at  DATETIMEOFFSET      NOT NULL DEFAULT GETUTCDATE(),
    updated_at  DATETIMEOFFSET      NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT PK_activity          PRIMARY KEY (activity_id),
    CONSTRAINT FK_act_tenant        FOREIGN KEY (tenant_id)           REFERENCES dbo.tenant       (tenant_id),
    CONSTRAINT FK_act_owner         FOREIGN KEY (owner_user_id)       REFERENCES dbo.profile      (id),
    CONSTRAINT FK_act_assigned      FOREIGN KEY (assigned_to_user_id) REFERENCES dbo.profile      (id),
    CONSTRAINT FK_act_account       FOREIGN KEY (account_id)          REFERENCES dbo.account      (account_id),
    CONSTRAINT FK_act_contact       FOREIGN KEY (contact_id)          REFERENCES dbo.contact      (contact_id),
    CONSTRAINT FK_act_lead          FOREIGN KEY (lead_id)             REFERENCES dbo.lead         (lead_id),
    CONSTRAINT FK_act_opp           FOREIGN KEY (opportunity_id)      REFERENCES dbo.opportunity  (opportunity_id),
    CONSTRAINT FK_act_quote         FOREIGN KEY (quote_id)            REFERENCES dbo.quote        (quote_id),
    CONSTRAINT FK_act_contract      FOREIGN KEY (contract_id)         REFERENCES dbo.contract     (contract_id),
    CONSTRAINT FK_act_case          FOREIGN KEY (case_id)             REFERENCES dbo.support_case (case_id),
    CONSTRAINT FK_act_project       FOREIGN KEY (project_id)          REFERENCES dbo.project      (project_id)
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_activity_tenant' AND object_id = OBJECT_ID('dbo.activity'))
    CREATE INDEX IX_activity_tenant ON dbo.activity (tenant_id);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_activity_account' AND object_id = OBJECT_ID('dbo.activity'))
    CREATE INDEX IX_activity_account ON dbo.activity (account_id);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_activity_sf_id' AND object_id = OBJECT_ID('dbo.activity'))
    CREATE UNIQUE INDEX IX_activity_sf_id ON dbo.activity (salesforce_id) WHERE salesforce_id IS NOT NULL;
GO

-- ============================================================
-- SECTION 19: BUILDING
-- ============================================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'building')
CREATE TABLE dbo.building (
    building_id                     UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    tenant_id                       UNIQUEIDENTIFIER NOT NULL,
    project_id                      UNIQUEIDENTIFIER NULL,
    name                            NVARCHAR(255)    NOT NULL,
    building_no                     NVARCHAR(100)    NULL,
    address_1                       NVARCHAR(255)    NULL,
    address_2                       NVARCHAR(255)    NULL,
    city                            NVARCHAR(100)    NULL,
    state                           NVARCHAR(100)    NULL,
    zip                             NVARCHAR(20)     NULL,
    square_footage                  DECIMAL(18,2)    NULL,
    primary_use                     NVARCHAR(100)    NULL,
    status                          NVARCHAR(50)     NULL,
    status_reason                   NVARCHAR(255)    NULL,
    db                              NVARCHAR(100)    NULL,
    place_id                        NVARCHAR(100)    NULL,
    place_code                      NVARCHAR(100)    NULL,
    exclude_from_greenx             BIT              NULL,
    current_energy_specialist_id    UNIQUEIDENTIFIER NULL,
    ecap_owner                      NVARCHAR(255)    NULL,
    ecap_building_id                NVARCHAR(255)    NULL,
    measure_building_id             NVARCHAR(255)    NULL,
    -- Salesforce
    salesforce_id                   NVARCHAR(255)    NULL,
    salesforce_project_id           NVARCHAR(255)    NULL,
    salesforce_energy_program_id    NVARCHAR(255)    NULL,
    salesforce_energy_specialist_id NVARCHAR(255)    NULL,
    salesforce_raw                  NVARCHAR(MAX)    NULL,  -- JSON
    -- Dynamics 365
    d365_building_id                NVARCHAR(255)    NULL,
    d365_energy_program_id          NVARCHAR(255)    NULL,
    d365_energy_specialist_id       NVARCHAR(255)    NULL,
    energy_program_d365_id          NVARCHAR(255)    NULL,
    energy_specialist_d365_id       NVARCHAR(255)    NULL,
    -- Other
    ecap_building_id2               NVARCHAR(255)    NULL,
    created_at  DATETIMEOFFSET      NOT NULL DEFAULT GETUTCDATE(),
    updated_at  DATETIMEOFFSET      NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT PK_building           PRIMARY KEY (building_id),
    CONSTRAINT FK_building_tenant    FOREIGN KEY (tenant_id)  REFERENCES dbo.tenant  (tenant_id),
    CONSTRAINT FK_building_project   FOREIGN KEY (project_id) REFERENCES dbo.project (project_id)
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_building_sf_id' AND object_id = OBJECT_ID('dbo.building'))
    CREATE UNIQUE INDEX IX_building_sf_id ON dbo.building (salesforce_id) WHERE salesforce_id IS NOT NULL;
GO

-- ============================================================
-- SECTION 20: CASE_COMMENT
-- ============================================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'case_comment')
CREATE TABLE dbo.case_comment (
    id          UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    case_id     UNIQUEIDENTIFIER NOT NULL,
    user_id     UNIQUEIDENTIFIER NOT NULL,
    comment     NVARCHAR(MAX)    NOT NULL,
    is_internal BIT              NOT NULL DEFAULT 0,
    created_at  DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT PK_case_comment        PRIMARY KEY (id),
    CONSTRAINT FK_case_comment_case   FOREIGN KEY (case_id)  REFERENCES dbo.support_case (case_id) ON DELETE CASCADE,
    CONSTRAINT FK_case_comment_user   FOREIGN KEY (user_id)  REFERENCES dbo.profile      (id)
);
GO

-- ============================================================
-- SECTION 21: AUDIT_LOG
-- ============================================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'audit_log')
CREATE TABLE dbo.audit_log (
    id              UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    tenant_id       UNIQUEIDENTIFIER NOT NULL,
    user_id         UNIQUEIDENTIFIER NOT NULL,
    user_email      NVARCHAR(255)    NULL,
    table_name      NVARCHAR(100)    NOT NULL,
    record_id       UNIQUEIDENTIFIER NOT NULL,
    action          NVARCHAR(10)     NOT NULL,
    old_values      NVARCHAR(MAX)    NULL,  -- JSON
    new_values      NVARCHAR(MAX)    NULL,  -- JSON
    changed_fields  NVARCHAR(MAX)    NULL,  -- JSON array of field names
    created_at      DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT PK_audit_log        PRIMARY KEY (id),
    CONSTRAINT FK_audit_tenant     FOREIGN KEY (tenant_id) REFERENCES dbo.tenant (tenant_id),
    CONSTRAINT CK_audit_action     CHECK (action IN ('INSERT','UPDATE','DELETE'))
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_audit_log_tenant' AND object_id = OBJECT_ID('dbo.audit_log'))
    CREATE INDEX IX_audit_log_tenant ON dbo.audit_log (tenant_id);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_audit_log_record' AND object_id = OBJECT_ID('dbo.audit_log'))
    CREATE INDEX IX_audit_log_record ON dbo.audit_log (record_id);
GO

-- ============================================================
-- SECTION 22: NOTIFICATIONS
-- ============================================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'notifications')
CREATE TABLE dbo.notifications (
    id              UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    tenant_id       UNIQUEIDENTIFIER NOT NULL,
    user_id         UNIQUEIDENTIFIER NOT NULL,
    title           NVARCHAR(MAX)    NOT NULL,
    message         NVARCHAR(MAX)    NOT NULL,
    type            NVARCHAR(50)     NULL DEFAULT 'info',
    [read]          BIT              NOT NULL DEFAULT 0,
    related_to_type NVARCHAR(50)     NULL,
    related_to_id   UNIQUEIDENTIFIER NULL,
    created_at      DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    updated_at      DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT PK_notifications        PRIMARY KEY (id),
    CONSTRAINT FK_notif_tenant         FOREIGN KEY (tenant_id) REFERENCES dbo.tenant  (tenant_id),
    CONSTRAINT FK_notif_user           FOREIGN KEY (user_id)   REFERENCES dbo.profile (id)
);
GO

-- ============================================================
-- SECTION 23: DOCUMENTS
-- ============================================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'documents')
CREATE TABLE dbo.documents (
    id                  UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    tenant_id           UNIQUEIDENTIFIER NOT NULL,
    owner_id            UNIQUEIDENTIFIER NOT NULL,
    name                NVARCHAR(255)    NOT NULL,
    description         NVARCHAR(MAX)    NULL,
    file_type           NVARCHAR(100)    NOT NULL,
    file_size           INT              NULL,
    category            NVARCHAR(100)    NULL,
    storage_path        NVARCHAR(MAX)    NOT NULL,
    related_to_type     NVARCHAR(100)    NULL,
    related_to_id       UNIQUEIDENTIFIER NULL,
    version             INT              NULL DEFAULT 1,
    is_current_version  BIT              NOT NULL DEFAULT 1,
    created_at          DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    updated_at          DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT PK_documents        PRIMARY KEY (id),
    CONSTRAINT FK_docs_tenant      FOREIGN KEY (tenant_id) REFERENCES dbo.tenant  (tenant_id),
    CONSTRAINT FK_docs_owner       FOREIGN KEY (owner_id)  REFERENCES dbo.profile (id)
);
GO

-- ============================================================
-- SECTION 24: EMAIL_ACCOUNTS
-- ============================================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'email_accounts')
CREATE TABLE dbo.email_accounts (
    id                          UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    user_id                     UNIQUEIDENTIFIER NOT NULL,
    tenant_id                   UNIQUEIDENTIFIER NOT NULL,
    provider                    NVARCHAR(50)     NOT NULL,
    email_address               NVARCHAR(255)    NOT NULL,
    access_token                NVARCHAR(MAX)    NOT NULL,
    refresh_token               NVARCHAR(MAX)    NULL,
    token_expires_at            DATETIMEOFFSET   NULL,
    shared_mailbox_email        NVARCHAR(255)    NULL,
    is_active                   BIT              NOT NULL DEFAULT 1,
    sync_enabled                BIT              NOT NULL DEFAULT 1,
    last_sync_at                DATETIMEOFFSET   NULL,
    auto_sync_interval_minutes  INT              NULL DEFAULT 5,
    created_at                  DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    updated_at                  DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT PK_email_accounts        PRIMARY KEY (id),
    CONSTRAINT FK_email_acct_user       FOREIGN KEY (user_id)   REFERENCES dbo.profile (id) ON DELETE CASCADE,
    CONSTRAINT FK_email_acct_tenant     FOREIGN KEY (tenant_id) REFERENCES dbo.tenant  (tenant_id),
    CONSTRAINT CK_email_acct_provider   CHECK (provider IN ('outlook','gmail')),
    CONSTRAINT UQ_email_acct            UNIQUE (user_id, email_address)
);
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'email_sync_log')
CREATE TABLE dbo.email_sync_log (
    id                  UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    email_account_id    UNIQUEIDENTIFIER NOT NULL,
    sync_type           NVARCHAR(100)    NOT NULL,
    status              NVARCHAR(50)     NOT NULL,
    items_synced        INT              NULL DEFAULT 0,
    error_message       NVARCHAR(MAX)    NULL,
    provider            NVARCHAR(50)     NOT NULL,
    created_at          DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT PK_email_sync_log        PRIMARY KEY (id),
    CONSTRAINT FK_email_sync_acct       FOREIGN KEY (email_account_id) REFERENCES dbo.email_accounts (id) ON DELETE CASCADE,
    CONSTRAINT CK_email_sync_status     CHECK (status IN ('success','error','in_progress'))
);
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'email_templates')
CREATE TABLE dbo.email_templates (
    id          UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    tenant_id   UNIQUEIDENTIFIER NOT NULL,
    user_id     UNIQUEIDENTIFIER NOT NULL,
    name        NVARCHAR(255)    NOT NULL,
    subject     NVARCHAR(255)    NOT NULL,
    body_html   NVARCHAR(MAX)    NOT NULL,
    category    NVARCHAR(100)    NULL,
    created_at  DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    updated_at  DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT PK_email_templates      PRIMARY KEY (id),
    CONSTRAINT FK_email_tmpl_tenant    FOREIGN KEY (tenant_id) REFERENCES dbo.tenant  (tenant_id),
    CONSTRAINT FK_email_tmpl_user      FOREIGN KEY (user_id)   REFERENCES dbo.profile (id)
);
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'email_webhook_subscriptions')
CREATE TABLE dbo.email_webhook_subscriptions (
    id                      UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    email_account_id        UNIQUEIDENTIFIER NOT NULL,
    tenant_id               UNIQUEIDENTIFIER NOT NULL,
    subscription_id         NVARCHAR(255)    NOT NULL,
    resource                NVARCHAR(255)    NOT NULL,
    change_type             NVARCHAR(100)    NOT NULL,
    expiration_datetime     DATETIMEOFFSET   NOT NULL,
    created_at              DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    updated_at              DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT PK_email_webhook         PRIMARY KEY (id),
    CONSTRAINT FK_email_webhook_acct    FOREIGN KEY (email_account_id) REFERENCES dbo.email_accounts (id) ON DELETE CASCADE,
    CONSTRAINT FK_email_webhook_tenant  FOREIGN KEY (tenant_id)        REFERENCES dbo.tenant         (tenant_id),
    CONSTRAINT UQ_email_webhook         UNIQUE (email_account_id, resource)
);
GO

-- ============================================================
-- SECTION 25: ENTITY_SEQUENCES (replaces pg sequences)
-- ============================================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'entity_sequences')
CREATE TABLE dbo.entity_sequences (
    tenant_id       UNIQUEIDENTIFIER NOT NULL,
    entity_type     NVARCHAR(50)     NOT NULL,
    last_sequence   INT              NOT NULL DEFAULT 0,
    CONSTRAINT PK_entity_sequences PRIMARY KEY (tenant_id, entity_type),
    CONSTRAINT FK_entity_seq_tenant FOREIGN KEY (tenant_id) REFERENCES dbo.tenant (tenant_id)
);
GO

-- ============================================================
-- SECTION 26: IMPORT_EXPORT_HISTORY
-- ============================================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'import_export_history')
CREATE TABLE dbo.import_export_history (
    id              UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    tenant_id       UNIQUEIDENTIFIER NOT NULL,
    user_id         UNIQUEIDENTIFIER NOT NULL,
    operation_type  NVARCHAR(20)     NOT NULL,
    entity_type     NVARCHAR(100)    NOT NULL,
    file_name       NVARCHAR(MAX)    NULL,
    file_path       NVARCHAR(MAX)    NULL,
    records_count   INT              NULL DEFAULT 0,
    status          NVARCHAR(50)     NOT NULL,
    error_message   NVARCHAR(MAX)    NULL,
    created_at      DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    completed_at    DATETIMEOFFSET   NULL,
    CONSTRAINT PK_import_export_history     PRIMARY KEY (id),
    CONSTRAINT FK_ieh_tenant                FOREIGN KEY (tenant_id) REFERENCES dbo.tenant  (tenant_id),
    CONSTRAINT FK_ieh_user                  FOREIGN KEY (user_id)   REFERENCES dbo.profile (id),
    CONSTRAINT CK_ieh_operation_type        CHECK (operation_type IN ('import','export')),
    CONSTRAINT CK_ieh_status                CHECK (status IN ('processing','success','failed'))
);
GO

-- ============================================================
-- SECTION 27: CREDENTIAL
-- ============================================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'credential')
CREATE TABLE dbo.credential (
    credential_id               UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    tenant_id                   UNIQUEIDENTIFIER NOT NULL,
    contact_id                  UNIQUEIDENTIFIER NULL,
    account_id                  UNIQUEIDENTIFIER NULL,
    name                        NVARCHAR(MAX)    NULL,
    credential_type             NVARCHAR(255)    NULL,
    credential_number           NVARCHAR(255)    NULL,
    cert_id                     NVARCHAR(255)    NULL,
    credentials                 NVARCHAR(MAX)    NULL,
    credentials_description     NVARCHAR(MAX)    NULL,
    included_in_resume          BIT              NULL DEFAULT 0,
    valid_to                    DATE             NULL,
    certified_date              DATE             NULL,
    record_created_on           DATE             NULL,
    status                      NVARCHAR(100)    NULL,
    status_reason               NVARCHAR(255)    NULL,
    comments                    NVARCHAR(MAX)    NULL,
    password                    NVARCHAR(MAX)    NULL,  -- stored encrypted in practice
    -- Salesforce
    salesforce_id               NVARCHAR(255)    NULL,
    salesforce_contact_id       NVARCHAR(255)    NULL,
    salesforce_account_id       NVARCHAR(255)    NULL,
    salesforce_organization_id  NVARCHAR(255)    NULL,
    salesforce_owner_id         NVARCHAR(255)    NULL,
    salesforce_raw              NVARCHAR(MAX)    NULL,  -- JSON
    created_at  DATETIMEOFFSET  NOT NULL DEFAULT GETUTCDATE(),
    updated_at  DATETIMEOFFSET  NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT PK_credential         PRIMARY KEY (credential_id),
    CONSTRAINT FK_cred_tenant        FOREIGN KEY (tenant_id)  REFERENCES dbo.tenant  (tenant_id),
    CONSTRAINT FK_cred_contact       FOREIGN KEY (contact_id) REFERENCES dbo.contact (contact_id),
    CONSTRAINT FK_cred_account       FOREIGN KEY (account_id) REFERENCES dbo.account (account_id)
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_credential_sf_id' AND object_id = OBJECT_ID('dbo.credential'))
    CREATE UNIQUE INDEX IX_credential_sf_id ON dbo.credential (salesforce_id) WHERE salesforce_id IS NOT NULL;
GO

-- ============================================================
-- SECTION 28: COMMISSION_SPLIT
-- ============================================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'commission_split')
CREATE TABLE dbo.commission_split (
    commission_split_id                 UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    tenant_id                           UNIQUEIDENTIFIER NOT NULL,
    contract_id                         UNIQUEIDENTIFIER NULL,
    project_id                          UNIQUEIDENTIFIER NULL,
    opportunity_id                      UNIQUEIDENTIFIER NULL,
    name                                NVARCHAR(MAX)    NULL,
    commission_type                     NVARCHAR(255)    NULL,
    role                                NVARCHAR(255)    NULL,
    split_type                          NVARCHAR(255)    NULL,
    status                              NVARCHAR(100)    NULL,
    status_reason                       NVARCHAR(255)    NULL,
    description                         NVARCHAR(MAX)    NULL,
    notes                               NVARCHAR(MAX)    NULL,
    based_on_tcv_or_ncv                 NVARCHAR(50)     NULL,
    commissions_approved                BIT              NULL,
    commissions_assigned                BIT              NULL,
    recoverable                         BIT              NULL,
    percentage                          DECIMAL(18,6)    NULL,
    commission_percent                  DECIMAL(18,6)    NULL,
    commission_percent_2                DECIMAL(18,6)    NULL,
    commission_percent_payments         INT              NULL,
    commission_percent_payments_2       INT              NULL,
    total_commission_override           DECIMAL(18,2)    NULL,
    total_commission_for_contract_term  DECIMAL(18,2)    NULL,
    first_payment_amount                DECIMAL(18,2)    NULL,
    first_payment_override              DECIMAL(18,2)    NULL,
    pop_payment                         DECIMAL(18,2)    NULL,
    over_quota_commission               BIT              NULL,
    over_quota_commission_amt           DECIMAL(18,2)    NULL,
    number_of_eligible_years            INT              NULL,
    number_of_payments                  INT              NULL,
    ncv                                 DECIMAL(18,2)    NULL,
    tcv                                 DECIMAL(18,2)    NULL,
    exchange_rate                       DECIMAL(18,6)    NULL,
    import_sequence_number              INT              NULL,
    modified_on                         DATE             NULL,
    customer_sign_date                  DATE             NULL,
    first_payment_due_date              DATE             NULL,
    over_quota_scheduled_date           DATE             NULL,
    d365_commission_split_id            NVARCHAR(255)    NULL,
    salesforce_id                       NVARCHAR(255)    NULL,
    salesforce_contract_id              NVARCHAR(255)    NULL,
    salesforce_project_id               NVARCHAR(255)    NULL,
    salesforce_opportunity_id           NVARCHAR(255)    NULL,
    salesforce_commission_recipient_id  NVARCHAR(255)    NULL,
    salesforce_raw                      NVARCHAR(MAX)    NULL,  -- JSON
    created_at  DATETIMEOFFSET          NOT NULL DEFAULT GETUTCDATE(),
    updated_at  DATETIMEOFFSET          NOT NULL DEFAULT GETUTCDATE(),
    energy_program_id                   UNIQUEIDENTIFIER NULL,   -- Energy_Program__c → energy_program
    contact_id                          UNIQUEIDENTIFIER NULL,   -- Commission_Recipient__c → Contact (MasterDetail in SF)
    commission_recipient_name           NVARCHAR(255)    NULL,   -- Commission_Recipient_Name__c
    CONSTRAINT PK_commission_split         PRIMARY KEY (commission_split_id),
    CONSTRAINT FK_cs_tenant                FOREIGN KEY (tenant_id)         REFERENCES dbo.tenant         (tenant_id),
    CONSTRAINT FK_cs_contract              FOREIGN KEY (contract_id)       REFERENCES dbo.contract       (contract_id),
    CONSTRAINT FK_cs_project               FOREIGN KEY (project_id)        REFERENCES dbo.project        (project_id),
    CONSTRAINT FK_cs_opportunity           FOREIGN KEY (opportunity_id)    REFERENCES dbo.opportunity    (opportunity_id),
    CONSTRAINT FK_cs_energy_program        FOREIGN KEY (energy_program_id) REFERENCES dbo.energy_program (energy_program_id),
    CONSTRAINT FK_cs_contact               FOREIGN KEY (contact_id)        REFERENCES dbo.contact        (contact_id)
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_commission_split_sf_id' AND object_id = OBJECT_ID('dbo.commission_split'))
    CREATE UNIQUE INDEX IX_commission_split_sf_id ON dbo.commission_split (salesforce_id) WHERE salesforce_id IS NOT NULL;
GO

-- ============================================================
-- SECTION 29: INVOICE_ITEM
-- ============================================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'invoice_item')
CREATE TABLE dbo.invoice_item (
    -- Primary key / system fields
    invoice_item_id             UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    tenant_id                   UNIQUEIDENTIFIER NOT NULL,
    invoice_id                  UNIQUEIDENTIFIER NOT NULL,  -- Invoice__c (MasterDetail → Invoice_CEN__c)
    project_id                  UNIQUEIDENTIFIER NULL,

    -- Salesforce name field
    name                        NVARCHAR(255)    NULL,      -- Invoice Item Name (nameField)

    -- Classification
    invoice_item_type           NVARCHAR(100)    NULL,      -- Invoice_Item_Type__c: Administrative Fee | Fixed | Fixed Fee Reimbursement | Performance Fee | Split Fee | Split Performance Fee | Termination Fee | Turnkey | Turnkey Credit | Fixed Fee | Turnkey Performance Fee | Split Base Fee

    -- Dates
    period_date                 DATE             NULL,      -- Period_Date__c

    -- Financials (all from Invoice_Item_CEN__c)
    fee_amount                  DECIMAL(17,2)    NULL,      -- Fee_Amount__c
    credit                      DECIMAL(17,2)    NULL,      -- Credit__c
    current_cost_avoidance      DECIMAL(17,2)    NULL,      -- Current_Cost_Avoidance__c (Gross Savings)
    previous_cost_avoidance     DECIMAL(17,2)    NULL,      -- Previous_Cost_Avoidance__c
    special_savings             DECIMAL(17,2)    NULL,      -- Special_Savings__c
    previous_special_savings    DECIMAL(17,2)    NULL,      -- Previous_Special_Savings__c
    current_less_previous       DECIMAL(17,2)    NULL,      -- Current_Less_Previous__c
    savings                     DECIMAL(18,8)    NULL,      -- Savings__c (Savings %)

    -- FK to energy_program (Energy_Program__c)
    energy_program_id           UNIQUEIDENTIFIER NULL,

    -- External IDs
    salesforce_id               NVARCHAR(255)    NULL,
    salesforce_invoice_id       NVARCHAR(255)    NULL,      -- parent invoice SF id
    salesforce_project_id       NVARCHAR(255)    NULL,
    salesforce_energy_program_id NVARCHAR(255)   NULL,      -- Energy_Program__c SF id
    d365_invoice_item_guid      NVARCHAR(50)     NULL,      -- D365InvoiceItemGuid__c (unique)

    salesforce_raw              NVARCHAR(MAX)    NULL,      -- JSON
    created_at                  DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    updated_at                  DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),

    CONSTRAINT PK_invoice_item            PRIMARY KEY (invoice_item_id),
    CONSTRAINT FK_inv_item_tenant         FOREIGN KEY (tenant_id)         REFERENCES dbo.tenant         (tenant_id),
    CONSTRAINT FK_inv_item_invoice        FOREIGN KEY (invoice_id)        REFERENCES dbo.invoice        (invoice_id) ON DELETE CASCADE,
    CONSTRAINT FK_inv_item_project        FOREIGN KEY (project_id)        REFERENCES dbo.project        (project_id),
    CONSTRAINT FK_inv_item_ep             FOREIGN KEY (energy_program_id) REFERENCES dbo.energy_program (energy_program_id),
    CONSTRAINT CK_inv_item_type           CHECK (invoice_item_type IN (
        'Administrative Fee','Fixed','Fixed Fee Reimbursement','Performance Fee',
        'Split Fee','Split Performance Fee','Termination Fee','Turnkey',
        'Turnkey Credit','Fixed Fee','Turnkey Performance Fee','Split Base Fee'
    ))
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_invoice_item_sf_id' AND object_id = OBJECT_ID('dbo.invoice_item'))
    CREATE UNIQUE INDEX IX_invoice_item_sf_id ON dbo.invoice_item (salesforce_id) WHERE salesforce_id IS NOT NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_invoice_item_d365_guid' AND object_id = OBJECT_ID('dbo.invoice_item'))
    CREATE UNIQUE INDEX IX_invoice_item_d365_guid ON dbo.invoice_item (d365_invoice_item_guid) WHERE d365_invoice_item_guid IS NOT NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_invoice_item_invoice_id' AND object_id = OBJECT_ID('dbo.invoice_item'))
    CREATE INDEX IX_invoice_item_invoice_id ON dbo.invoice_item (invoice_id);
GO

-- ============================================================
-- SECTION 29.5: INVOICE_RECON
-- Reconciliation data from recon(in).csv - linked to invoice_item
-- ============================================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'invoice_recon')
CREATE TABLE dbo.invoice_recon (
    -- Primary key / system fields
    invoice_recon_id        UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    tenant_id               UNIQUEIDENTIFIER NOT NULL,
    invoice_item_id         UNIQUEIDENTIFIER NOT NULL,  -- FK to invoice_item (invoiceitemid from CSV)
    invoice_id              UNIQUEIDENTIFIER NULL,      -- Denormalized for query efficiency

    -- Organization / Location
    org_name                NVARCHAR(255)    NULL,      -- Orgname (e.g. "Fresno USD-CA")
    place_info              NVARCHAR(255)    NULL,      -- placeInfo (e.g. "Roosevelt HS (SOLAR)")
    logical_device_code     NVARCHAR(100)    NULL,      -- logicaldevicecode

    -- Dates
    report_date             DATETIME         NULL,      -- ReportDate
    begin_date              DATETIME         NULL,      -- BeginDate

    -- Classification
    category                NVARCHAR(50)     NULL,      -- Category (e.g. "New", "Old")

    -- Financial Data (from recon(in).csv)
    current_batcc           DECIMAL(15,2)    NULL,      -- Current BATCC
    previous_batcc          DECIMAL(15,2)    NULL,      -- Previous BATCC
    current_actual_cost     DECIMAL(15,2)    NULL,      -- Current Actual Cost
    previous_actual_cost    DECIMAL(15,2)    NULL,      -- Previous Actual Cost
    current_ca              DECIMAL(15,2)    NULL,      -- Current CA (Cost Avoidance)
    previous_ca             DECIMAL(15,2)    NULL,      -- Previous CA

    -- References / External IDs
    energy_program_id       UNIQUEIDENTIFIER NULL,      -- EnergyProgram (GUID)
    sales_doc_name          NVARCHAR(100)    NULL,      -- SalesDocName (e.g. "25-Dec")
    place_id                NVARCHAR(100)    NULL,      -- PlaceId (GUID)
    invoice_item_name       NVARCHAR(255)    NULL,      -- invoiceitemname
    salesforce_id           NVARCHAR(255)    NULL,      -- Optional SF ID

    created_at              DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    updated_at              DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),

    CONSTRAINT PK_invoice_recon          PRIMARY KEY (invoice_recon_id),
    CONSTRAINT FK_inv_recon_tenant       FOREIGN KEY (tenant_id)      REFERENCES dbo.tenant      (tenant_id),
    CONSTRAINT FK_inv_recon_item         FOREIGN KEY (invoice_item_id) REFERENCES dbo.invoice_item (invoice_item_id) ON DELETE CASCADE,
    CONSTRAINT FK_inv_recon_invoice      FOREIGN KEY (invoice_id)     REFERENCES dbo.invoice      (invoice_id) ON DELETE SET NULL
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_invoice_recon_tenant' AND object_id = OBJECT_ID('dbo.invoice_recon'))
    CREATE INDEX IX_invoice_recon_tenant ON dbo.invoice_recon (tenant_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_invoice_recon_item' AND object_id = OBJECT_ID('dbo.invoice_recon'))
    CREATE INDEX IX_invoice_recon_item ON dbo.invoice_recon (invoice_item_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_invoice_recon_invoice' AND object_id = OBJECT_ID('dbo.invoice_recon'))
    CREATE INDEX IX_invoice_recon_invoice ON dbo.invoice_recon (invoice_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_invoice_recon_report_date' AND object_id = OBJECT_ID('dbo.invoice_recon'))
    CREATE INDEX IX_invoice_recon_report_date ON dbo.invoice_recon (report_date);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_invoice_recon_energy_program' AND object_id = OBJECT_ID('dbo.invoice_recon'))
    CREATE INDEX IX_invoice_recon_energy_program ON dbo.invoice_recon (energy_program_id);
GO

-- ============================================================
-- SECTION 30: SALESFORCE_USER
-- ============================================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'salesforce_user')
CREATE TABLE dbo.salesforce_user (
    salesforce_user_id      UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    tenant_id               UNIQUEIDENTIFIER NOT NULL,
    salesforce_id           NVARCHAR(255)    NULL,
    salesforce_user_role_id NVARCHAR(255)    NULL,
    salesforce_contact_id   NVARCHAR(255)    NULL,
    salesforce_account_id   NVARCHAR(255)    NULL,
    username                NVARCHAR(255)    NULL,
    alias                   NVARCHAR(100)    NULL,
    email                   NVARCHAR(255)    NULL,
    sender_email            NVARCHAR(255)    NULL,
    sender_name             NVARCHAR(255)    NULL,
    first_name              NVARCHAR(100)    NULL,
    last_name               NVARCHAR(100)    NULL,
    middle_name             NVARCHAR(100)    NULL,
    suffix                  NVARCHAR(50)     NULL,
    title                   NVARCHAR(255)    NULL,
    department              NVARCHAR(255)    NULL,
    division                NVARCHAR(255)    NULL,
    company_name            NVARCHAR(255)    NULL,
    phone                   NVARCHAR(50)     NULL,
    mobile_phone            NVARCHAR(50)     NULL,
    fax                     NVARCHAR(50)     NULL,
    employee_number         NVARCHAR(100)    NULL,
    user_type               NVARCHAR(100)    NULL,
    user_subtype            NVARCHAR(100)    NULL,
    locale_sid_key          NVARCHAR(100)    NULL,
    language_locale_key     NVARCHAR(100)    NULL,
    time_zone_sid_key       NVARCHAR(100)    NULL,
    profile_id              NVARCHAR(255)    NULL,
    federation_identifier   NVARCHAR(255)    NULL,
    is_active               BIT              NULL DEFAULT 1,
    is_system_controlled    BIT              NULL DEFAULT 0,
    street                  NVARCHAR(255)    NULL,
    city                    NVARCHAR(100)    NULL,
    state                   NVARCHAR(100)    NULL,
    postal_code             NVARCHAR(20)     NULL,
    country                 NVARCHAR(100)    NULL,
    extension               NVARCHAR(50)     NULL,
    about_me                NVARCHAR(MAX)    NULL,
    signature               NVARCHAR(MAX)    NULL,
    salesforce_raw          NVARCHAR(MAX)    NULL,  -- JSON
    created_at  DATETIMEOFFSET NOT NULL DEFAULT GETUTCDATE(),
    updated_at  DATETIMEOFFSET NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT PK_salesforce_user       PRIMARY KEY (salesforce_user_id),
    CONSTRAINT FK_sf_user_tenant        FOREIGN KEY (tenant_id) REFERENCES dbo.tenant (tenant_id)
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_salesforce_user_sf_id' AND object_id = OBJECT_ID('dbo.salesforce_user'))
    CREATE UNIQUE INDEX IX_salesforce_user_sf_id ON dbo.salesforce_user (salesforce_id) WHERE salesforce_id IS NOT NULL;
GO

-- ============================================================
-- SECTION 31a: ENERGY_PROGRAM_TEAM_MEMBER
-- Source: Energy_Program_Team_Members__c.object
-- ============================================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'energy_program_team_member')
CREATE TABLE dbo.energy_program_team_member (
    ep_team_member_id   UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    tenant_id           UNIQUEIDENTIFIER NOT NULL,
    energy_program_id   UNIQUEIDENTIFIER NOT NULL,  -- Energy_Program__c (MasterDetail)
    contact_id          UNIQUEIDENTIFIER NULL,       -- EP_Team_Member__c → Contact
    name                NVARCHAR(255)    NULL,        -- nameField (AutoNumber)
    role                NVARCHAR(100)    NULL,        -- Role__c: Client Manager (Internal) | Energy Specialist | Hiring Superintendent | Implementation Consultant | M&V Lead | Regional VP | Sales Person | Technical Lead
    is_primary          BIT              NOT NULL DEFAULT 0,  -- Is_Primary__c
    is_active           BIT              NOT NULL DEFAULT 1,  -- Active__c
    start_date          DATE             NULL,
    end_date            DATE             NULL,        -- End_Date__c
    notes               NVARCHAR(MAX)    NULL,        -- Notes__c
    salesforce_id       NVARCHAR(255)    NULL,
    salesforce_ep_id    NVARCHAR(255)    NULL,
    salesforce_contact_id NVARCHAR(255)  NULL,
    created_at          DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    updated_at          DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT PK_ep_team_member         PRIMARY KEY (ep_team_member_id),
    CONSTRAINT FK_eptm_tenant            FOREIGN KEY (tenant_id)         REFERENCES dbo.tenant         (tenant_id),
    CONSTRAINT FK_eptm_energy_program    FOREIGN KEY (energy_program_id) REFERENCES dbo.energy_program (energy_program_id) ON DELETE CASCADE,
    CONSTRAINT FK_eptm_contact           FOREIGN KEY (contact_id)        REFERENCES dbo.contact        (contact_id),
    CONSTRAINT CK_eptm_role              CHECK (role IN (
        'Client Manager (Internal)','Energy Specialist','Hiring Superintendent',
        'Implementation Consultant','M&V Lead','Regional VP','Sales Person','Technical Lead'
    ))
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_eptm_ep_id' AND object_id = OBJECT_ID('dbo.energy_program_team_member'))
    CREATE INDEX IX_eptm_ep_id ON dbo.energy_program_team_member (energy_program_id);
GO

-- ============================================================
-- SECTION 31b: COMMISSION_SPLIT_SCHEDULE
-- Source: Commission_Split_Schedule__c.object
-- ============================================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'commission_split_schedule')
CREATE TABLE dbo.commission_split_schedule (
    css_id                  UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    tenant_id               UNIQUEIDENTIFIER NOT NULL,
    commission_split_id     UNIQUEIDENTIFIER NOT NULL,  -- Commission_Split__c (MasterDetail)
    name                    NVARCHAR(255)    NULL,        -- nameField (AutoNumber)
    period                  NVARCHAR(20)     NULL,        -- Period__c: Year 1 – Year 10
    commission_amount       DECIMAL(12,0)    NULL,        -- Commission_Amount__c
    commission_percent      DECIMAL(18,6)    NULL,        -- Commission_Percent__c
    scheduled_date          DATE             NULL,        -- Scheduled_Date__c
    payment_status          NVARCHAR(50)     NULL,        -- Payment_Status__c: Pending | Paid | Canceled
    salesforce_id           NVARCHAR(255)    NULL,
    salesforce_cs_id        NVARCHAR(255)    NULL,        -- parent commission_split SF id
    created_at              DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    updated_at              DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT PK_css             PRIMARY KEY (css_id),
    CONSTRAINT FK_css_tenant      FOREIGN KEY (tenant_id)           REFERENCES dbo.tenant          (tenant_id),
    CONSTRAINT FK_css_split       FOREIGN KEY (commission_split_id) REFERENCES dbo.commission_split (commission_split_id) ON DELETE CASCADE,
    CONSTRAINT CK_css_status      CHECK (payment_status IN ('Pending','Paid','Canceled')),
    CONSTRAINT CK_css_period      CHECK (period IN (
        'Year 1','Year 2','Year 3','Year 4','Year 5',
        'Year 6','Year 7','Year 8','Year 9','Year 10'
    ))
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_css_sf_id' AND object_id = OBJECT_ID('dbo.commission_split_schedule'))
    CREATE UNIQUE INDEX IX_css_sf_id ON dbo.commission_split_schedule (salesforce_id) WHERE salesforce_id IS NOT NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_css_split_id' AND object_id = OBJECT_ID('dbo.commission_split_schedule'))
    CREATE INDEX IX_css_split_id ON dbo.commission_split_schedule (commission_split_id);
GO

-- ============================================================
-- SECTION 31c: OPPORTUNITY_LINE_ITEM
-- Source: OpportunityLineItem.object
-- ============================================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'opportunity_line_item')
CREATE TABLE dbo.opportunity_line_item (
    opp_line_item_id    UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    tenant_id           UNIQUEIDENTIFIER NOT NULL,
    opportunity_id      UNIQUEIDENTIFIER NOT NULL,  -- OpportunityId → Opportunity
    product_id          UNIQUEIDENTIFIER NULL,       -- Product2Id → product
    name                NVARCHAR(255)    NULL,        -- Name (auto-generated in SF)
    description         NVARCHAR(MAX)    NULL,        -- Description
    product_code        NVARCHAR(255)    NULL,        -- ProductCode
    quantity            DECIMAL(18,2)    NULL DEFAULT 1,
    unit_price          DECIMAL(18,2)    NULL,        -- UnitPrice
    list_price          DECIMAL(18,2)    NULL,        -- ListPrice
    discount            DECIMAL(10,4)    NULL,        -- Discount
    subtotal            DECIMAL(18,2)    NULL,        -- Subtotal
    total_price         DECIMAL(18,2)    NULL,        -- TotalPrice
    service_date        DATE             NULL,        -- ServiceDate
    salesforce_id       NVARCHAR(255)    NULL,
    salesforce_opp_id   NVARCHAR(255)    NULL,
    created_at          DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    updated_at          DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT PK_opp_line_item      PRIMARY KEY (opp_line_item_id),
    CONSTRAINT FK_oli_tenant         FOREIGN KEY (tenant_id)      REFERENCES dbo.tenant      (tenant_id),
    CONSTRAINT FK_oli_opportunity    FOREIGN KEY (opportunity_id) REFERENCES dbo.opportunity (opportunity_id) ON DELETE CASCADE,
    CONSTRAINT FK_oli_product        FOREIGN KEY (product_id)     REFERENCES dbo.product     (product_id)
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_oli_opp_id' AND object_id = OBJECT_ID('dbo.opportunity_line_item'))
    CREATE INDEX IX_oli_opp_id ON dbo.opportunity_line_item (opportunity_id);
GO

-- ============================================================
-- SECTION 31d: OPPORTUNITY_CONTACT_ROLE
-- Source: OpportunityContactRole.object
-- ============================================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'opportunity_contact_role')
CREATE TABLE dbo.opportunity_contact_role (
    ocr_id              UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    tenant_id           UNIQUEIDENTIFIER NOT NULL,
    opportunity_id      UNIQUEIDENTIFIER NOT NULL,  -- OpportunityId → Opportunity
    contact_id          UNIQUEIDENTIFIER NOT NULL,  -- ContactId → Contact
    role                NVARCHAR(100)    NULL,        -- Role (picklist)
    is_primary          BIT              NOT NULL DEFAULT 0,  -- IsPrimary
    start_date          DATE             NULL,        -- Start_Date__c
    end_date            DATE             NULL,        -- End_Date__c
    salesforce_id       NVARCHAR(255)    NULL,
    created_at          DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    updated_at          DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT PK_ocr              PRIMARY KEY (ocr_id),
    CONSTRAINT FK_ocr_tenant       FOREIGN KEY (tenant_id)      REFERENCES dbo.tenant      (tenant_id),
    CONSTRAINT FK_ocr_opportunity  FOREIGN KEY (opportunity_id) REFERENCES dbo.opportunity (opportunity_id) ON DELETE CASCADE,
    CONSTRAINT FK_ocr_contact      FOREIGN KEY (contact_id)     REFERENCES dbo.contact     (contact_id),
    CONSTRAINT UQ_ocr_opp_contact  UNIQUE (opportunity_id, contact_id, role)
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ocr_opp_id' AND object_id = OBJECT_ID('dbo.opportunity_contact_role'))
    CREATE INDEX IX_ocr_opp_id ON dbo.opportunity_contact_role (opportunity_id);
GO

-- ============================================================
-- SECTION 31e: ACCOUNT_CONTACT_RELATION
-- Source: AccountContactRelation.object
-- Many-to-many between Account and Contact (beyond primary contact)
-- ============================================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'account_contact_relation')
CREATE TABLE dbo.account_contact_relation (
    acr_id              UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    tenant_id           UNIQUEIDENTIFIER NOT NULL,
    account_id          UNIQUEIDENTIFIER NOT NULL,  -- AccountId → Account
    contact_id          UNIQUEIDENTIFIER NOT NULL,  -- ContactId → Contact
    connection_role     NVARCHAR(100)    NULL,        -- Connection_Role__c (picklist: Superintendent, Energy Specialist, Billing Contact, etc.)
    description         NVARCHAR(MAX)    NULL,        -- Description__c
    is_active           BIT              NOT NULL DEFAULT 1,   -- IsActive
    is_direct           BIT              NOT NULL DEFAULT 0,   -- IsDirect (primary account contact)
    start_date          DATE             NULL,
    end_date            DATE             NULL,        -- EndDate
    omit_from_reporting NVARCHAR(10)     NULL,        -- Omit_From_Reporting__c
    salesforce_id       NVARCHAR(255)    NULL,
    created_at          DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    updated_at          DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT PK_acr              PRIMARY KEY (acr_id),
    CONSTRAINT FK_acr_tenant       FOREIGN KEY (tenant_id)  REFERENCES dbo.tenant  (tenant_id),
    CONSTRAINT FK_acr_account      FOREIGN KEY (account_id) REFERENCES dbo.account (account_id),
    CONSTRAINT FK_acr_contact      FOREIGN KEY (contact_id) REFERENCES dbo.contact (contact_id),
    CONSTRAINT UQ_acr_acct_contact UNIQUE (account_id, contact_id)
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_acr_account_id' AND object_id = OBJECT_ID('dbo.account_contact_relation'))
    CREATE INDEX IX_acr_account_id ON dbo.account_contact_relation (account_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_acr_contact_id' AND object_id = OBJECT_ID('dbo.account_contact_relation'))
    CREATE INDEX IX_acr_contact_id ON dbo.account_contact_relation (contact_id);
GO

-- ============================================================
-- SECTION 31: REMAINING SUPPORT TABLES
-- ============================================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'project_user')
CREATE TABLE dbo.project_user (
    project_id  UNIQUEIDENTIFIER NOT NULL,
    user_id     UNIQUEIDENTIFIER NOT NULL,
    assigned_at DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT PK_project_user        PRIMARY KEY (project_id, user_id),
    CONSTRAINT FK_proj_user_project   FOREIGN KEY (project_id) REFERENCES dbo.project (project_id) ON DELETE CASCADE,
    CONSTRAINT FK_proj_user_profile   FOREIGN KEY (user_id)    REFERENCES dbo.profile (id)
);
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'project_rate')
CREATE TABLE dbo.project_rate (
    project_rate_id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    tenant_id       UNIQUEIDENTIFIER NOT NULL,
    project_id      UNIQUEIDENTIFIER NOT NULL,
    hourly_rate     DECIMAL(10,2)    NOT NULL,
    valid_from      DATE             NOT NULL DEFAULT CAST(GETUTCDATE() AS DATE),
    valid_to        DATE             NULL,
    created_at      DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT PK_project_rate        PRIMARY KEY (project_rate_id),
    CONSTRAINT FK_proj_rate_tenant    FOREIGN KEY (tenant_id)   REFERENCES dbo.tenant  (tenant_id),
    CONSTRAINT FK_proj_rate_project   FOREIGN KEY (project_id)  REFERENCES dbo.project (project_id) ON DELETE CASCADE,
    CONSTRAINT CK_proj_rate_dates     CHECK (valid_to IS NULL OR valid_to >= valid_from)
);
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'project_ledger_entry')
CREATE TABLE dbo.project_ledger_entry (
    id              UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    tenant_id       UNIQUEIDENTIFIER NOT NULL,
    project_id      UNIQUEIDENTIFIER NOT NULL,
    task_id         UNIQUEIDENTIFIER NULL,
    entry_number    INT              NOT NULL,
    posting_date    DATE             NOT NULL,
    document_number NVARCHAR(100)    NULL,
    entry_type      NVARCHAR(100)    NULL,
    type            NVARCHAR(100)    NULL,
    resource_no     NVARCHAR(100)    NULL,
    description     NVARCHAR(MAX)    NULL,
    quantity        DECIMAL(18,4)    NULL DEFAULT 0,
    unit_of_measure NVARCHAR(50)     NULL,
    unit_cost       DECIMAL(15,2)    NULL DEFAULT 0,
    total_cost      DECIMAL(15,2)    NULL DEFAULT 0,
    unit_price      DECIMAL(15,2)    NULL DEFAULT 0,
    total_price     DECIMAL(15,2)    NULL DEFAULT 0,
    bc_id           UNIQUEIDENTIFIER NULL,
    bc_last_synced_at DATETIMEOFFSET NULL,
    created_at      DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT PK_project_ledger_entry      PRIMARY KEY (id),
    CONSTRAINT FK_ple_tenant                FOREIGN KEY (tenant_id)  REFERENCES dbo.tenant  (tenant_id),
    CONSTRAINT FK_ple_project               FOREIGN KEY (project_id) REFERENCES dbo.project (project_id) ON DELETE CASCADE,
    CONSTRAINT FK_ple_task                  FOREIGN KEY (task_id)    REFERENCES dbo.task    (task_id)
);
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'project_planning_line')
CREATE TABLE dbo.project_planning_line (
    id                          UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    tenant_id                   UNIQUEIDENTIFIER NOT NULL,
    project_id                  UNIQUEIDENTIFIER NOT NULL,
    task_id                     UNIQUEIDENTIFIER NULL,
    line_number                 INT              NOT NULL,
    line_type                   NVARCHAR(50)     NOT NULL DEFAULT 'Budget',
    planning_date               DATE             NULL,
    planned_delivery_date       DATE             NULL,
    type                        NVARCHAR(100)    NULL,
    resource_no                 NVARCHAR(100)    NULL,
    no                          NVARCHAR(100)    NULL,
    document_no                 NVARCHAR(100)    NULL,
    description                 NVARCHAR(MAX)    NULL,
    quantity                    DECIMAL(18,4)    NULL DEFAULT 0,
    qty_to_transfer_to_journal  DECIMAL(18,4)    NULL DEFAULT 0,
    unit_of_measure             NVARCHAR(50)     NULL,
    unit_cost                   DECIMAL(15,2)    NULL DEFAULT 0,
    unit_price                  DECIMAL(15,2)    NULL DEFAULT 0,
    total_cost                  DECIMAL(15,2)    NULL DEFAULT 0,
    total_price                 DECIMAL(15,2)    NULL DEFAULT 0,
    line_amount                 DECIMAL(15,2)    NULL DEFAULT 0,
    invoiced_amount             DECIMAL(15,2)    NULL DEFAULT 0,
    bc_id                       UNIQUEIDENTIFIER NULL,
    bc_sync_status              NVARCHAR(50)     NULL DEFAULT 'pending',
    bc_last_synced_at           DATETIMEOFFSET   NULL,
    created_at                  DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    updated_at                  DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT PK_project_planning_line     PRIMARY KEY (id),
    CONSTRAINT FK_ppl_tenant                FOREIGN KEY (tenant_id)  REFERENCES dbo.tenant  (tenant_id),
    CONSTRAINT FK_ppl_project               FOREIGN KEY (project_id) REFERENCES dbo.project (project_id) ON DELETE CASCADE,
    CONSTRAINT FK_ppl_task                  FOREIGN KEY (task_id)    REFERENCES dbo.task    (task_id)
);
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'tag')
CREATE TABLE dbo.tag (
    tag_id      UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    tenant_id   UNIQUEIDENTIFIER NOT NULL,
    name        NVARCHAR(50)     NOT NULL,
    color       NVARCHAR(7)      NULL DEFAULT '#3b82f6',
    created_at  DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT PK_tag        PRIMARY KEY (tag_id),
    CONSTRAINT FK_tag_tenant FOREIGN KEY (tenant_id) REFERENCES dbo.tenant (tenant_id),
    CONSTRAINT UQ_tag_name   UNIQUE (tenant_id, name)
);
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'time_entry_tag')
CREATE TABLE dbo.time_entry_tag (
    time_entry_id   UNIQUEIDENTIFIER NOT NULL,
    tag_id          UNIQUEIDENTIFIER NOT NULL,
    CONSTRAINT PK_time_entry_tag    PRIMARY KEY (time_entry_id, tag_id),
    CONSTRAINT FK_tet_time_entry    FOREIGN KEY (time_entry_id) REFERENCES dbo.time_entry (time_entry_id) ON DELETE CASCADE,
    CONSTRAINT FK_tet_tag           FOREIGN KEY (tag_id)        REFERENCES dbo.tag         (tag_id)
);
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'user_rate')
CREATE TABLE dbo.user_rate (
    user_rate_id    UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    tenant_id       UNIQUEIDENTIFIER NOT NULL,
    user_id         UNIQUEIDENTIFIER NOT NULL,
    hourly_rate     DECIMAL(10,2)    NOT NULL,
    valid_from      DATE             NOT NULL,
    valid_to        DATE             NULL,
    created_at      DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT PK_user_rate        PRIMARY KEY (user_rate_id),
    CONSTRAINT FK_user_rate_tenant FOREIGN KEY (tenant_id) REFERENCES dbo.tenant  (tenant_id),
    CONSTRAINT FK_user_rate_user   FOREIGN KEY (user_id)   REFERENCES dbo.profile (id),
    CONSTRAINT CK_user_rate_rate   CHECK (hourly_rate >= 0)
);
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'role_permissions')
CREATE TABLE dbo.role_permissions (
    id          UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    tenant_id   UNIQUEIDENTIFIER NOT NULL,
    role        NVARCHAR(50)     NOT NULL,
    resource    NVARCHAR(50)     NOT NULL,
    can_create  BIT              NOT NULL DEFAULT 0,
    can_read    BIT              NOT NULL DEFAULT 0,
    can_update  BIT              NOT NULL DEFAULT 0,
    can_delete  BIT              NOT NULL DEFAULT 0,
    created_at  DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    updated_at  DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT PK_role_permissions     PRIMARY KEY (id),
    CONSTRAINT FK_rp_tenant            FOREIGN KEY (tenant_id) REFERENCES dbo.tenant (tenant_id),
    CONSTRAINT UQ_role_permissions     UNIQUE (role, resource, tenant_id)
);
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'role_feature_access')
CREATE TABLE dbo.role_feature_access (
    id          UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    tenant_id   UNIQUEIDENTIFIER NOT NULL,
    role        NVARCHAR(50)     NOT NULL,
    feature_key NVARCHAR(200)    NOT NULL,
    is_visible  BIT              NOT NULL DEFAULT 1,
    created_at  DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    updated_at  DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT PK_role_feature_access  PRIMARY KEY (id),
    CONSTRAINT FK_rfa_tenant           FOREIGN KEY (tenant_id) REFERENCES dbo.tenant (tenant_id),
    CONSTRAINT UQ_role_feature_access  UNIQUE (tenant_id, role, feature_key)
);
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'role_field_access')
CREATE TABLE dbo.role_field_access (
    id          UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    tenant_id   UNIQUEIDENTIFIER NOT NULL,
    role        NVARCHAR(50)     NOT NULL,
    resource    NVARCHAR(100)    NOT NULL,
    field_key   NVARCHAR(100)    NOT NULL,
    is_visible  BIT              NOT NULL DEFAULT 1,
    created_at  DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    updated_at  DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT PK_role_field_access    PRIMARY KEY (id),
    CONSTRAINT FK_rfia_tenant          FOREIGN KEY (tenant_id) REFERENCES dbo.tenant (tenant_id),
    CONSTRAINT UQ_role_field_access    UNIQUE (tenant_id, role, resource, field_key)
);
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'tenant_branding')
CREATE TABLE dbo.tenant_branding (
    id                  UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    tenant_id           UNIQUEIDENTIFIER NOT NULL,
    company_name        NVARCHAR(MAX)    NULL,
    logo_url            NVARCHAR(MAX)    NULL,
    favicon_url         NVARCHAR(MAX)    NULL,
    primary_color       NVARCHAR(20)     NULL DEFAULT '#0ea5e9',
    secondary_color     NVARCHAR(20)     NULL DEFAULT '#8b5cf6',
    accent_color        NVARCHAR(20)     NULL DEFAULT '#10b981',
    sidebar_color       NVARCHAR(20)     NULL,
    heading_font_color  NVARCHAR(20)     NULL,
    menu_font_color     NVARCHAR(20)     NULL,
    font_family         NVARCHAR(100)    NULL DEFAULT 'Inter',
    custom_css          NVARCHAR(MAX)    NULL,
    show_powered_by     BIT              NOT NULL DEFAULT 1,
    support_email       NVARCHAR(255)    NULL,
    support_phone       NVARCHAR(50)     NULL,
    created_at          DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    updated_at          DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT PK_tenant_branding      PRIMARY KEY (id),
    CONSTRAINT FK_tb_tenant            FOREIGN KEY (tenant_id) REFERENCES dbo.tenant (tenant_id),
    CONSTRAINT UQ_tenant_branding      UNIQUE (tenant_id)
);
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'tenant_hidden_features')
CREATE TABLE dbo.tenant_hidden_features (
    id          UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    tenant_id   UNIQUEIDENTIFIER NOT NULL,
    feature_key NVARCHAR(200)    NOT NULL,
    is_hidden   BIT              NOT NULL DEFAULT 1,
    hidden_by   UNIQUEIDENTIFIER NULL,
    hidden_at   DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    reason      NVARCHAR(MAX)    NULL,
    CONSTRAINT PK_tenant_hidden_features   PRIMARY KEY (id),
    CONSTRAINT FK_thf_tenant               FOREIGN KEY (tenant_id) REFERENCES dbo.tenant   (tenant_id),
    CONSTRAINT FK_thf_hidden_by            FOREIGN KEY (hidden_by) REFERENCES dbo.app_user (id),
    CONSTRAINT UQ_tenant_hidden_features   UNIQUE (tenant_id, feature_key)
);
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'business_central_config')
CREATE TABLE dbo.business_central_config (
    id                  UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    tenant_id           UNIQUEIDENTIFIER NOT NULL,
    client_id           NVARCHAR(MAX)    NOT NULL,
    client_secret       NVARCHAR(MAX)    NOT NULL,
    bc_tenant_id        NVARCHAR(MAX)    NOT NULL,
    redirect_uri        NVARCHAR(MAX)    NOT NULL,
    use_app_permissions BIT              NOT NULL DEFAULT 0,
    created_at          DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    updated_at          DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT PK_bc_config        PRIMARY KEY (id),
    CONSTRAINT FK_bc_config_tenant FOREIGN KEY (tenant_id) REFERENCES dbo.tenant (tenant_id),
    CONSTRAINT UQ_bc_config_tenant UNIQUE (tenant_id)
);
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'business_central_connections')
CREATE TABLE dbo.business_central_connections (
    id                          UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    tenant_id                   UNIQUEIDENTIFIER NOT NULL,
    user_id                     UNIQUEIDENTIFIER NOT NULL,
    environment_name            NVARCHAR(MAX)    NOT NULL,
    company_id                  NVARCHAR(MAX)    NOT NULL,
    access_token                NVARCHAR(MAX)    NOT NULL,
    refresh_token               NVARCHAR(MAX)    NULL,
    token_expires_at            DATETIMEOFFSET   NULL,
    client_id                   NVARCHAR(MAX)    NULL,
    client_secret               NVARCHAR(MAX)    NULL,
    bc_tenant_id                NVARCHAR(MAX)    NULL,
    redirect_uri                NVARCHAR(MAX)    NULL,
    bc_jobs_endpoint            NVARCHAR(MAX)    NULL,
    is_active                   BIT              NOT NULL DEFAULT 1,
    sync_enabled                BIT              NOT NULL DEFAULT 1,
    last_sync_at                DATETIMEOFFSET   NULL,
    auto_sync_interval_minutes  INT              NULL DEFAULT 15,
    created_at                  DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    updated_at                  DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT PK_bc_connections        PRIMARY KEY (id),
    CONSTRAINT FK_bc_conn_tenant        FOREIGN KEY (tenant_id) REFERENCES dbo.tenant  (tenant_id),
    CONSTRAINT FK_bc_conn_user          FOREIGN KEY (user_id)   REFERENCES dbo.profile (id)
);
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'business_central_sync_log')
CREATE TABLE dbo.business_central_sync_log (
    id              UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    connection_id   UNIQUEIDENTIFIER NOT NULL,
    sync_type       NVARCHAR(MAX)    NOT NULL,
    status          NVARCHAR(50)     NOT NULL,
    items_synced    INT              NULL,
    error_message   NVARCHAR(MAX)    NULL,
    created_at      DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT PK_bc_sync_log       PRIMARY KEY (id),
    CONSTRAINT FK_bc_sync_conn      FOREIGN KEY (connection_id) REFERENCES dbo.business_central_connections (id) ON DELETE CASCADE
);
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'integrations')
CREATE TABLE dbo.integrations (
    id          UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    user_id     UNIQUEIDENTIFIER NOT NULL,
    tenant_id   UNIQUEIDENTIFIER NOT NULL,
    provider    NVARCHAR(100)    NOT NULL,
    status      NVARCHAR(50)     NULL DEFAULT 'active',
    config      NVARCHAR(MAX)    NULL,  -- JSON
    last_sync   DATETIMEOFFSET   NULL,
    created_at  DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    updated_at  DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT PK_integrations        PRIMARY KEY (id),
    CONSTRAINT FK_integrations_user   FOREIGN KEY (user_id)   REFERENCES dbo.profile (id),
    CONSTRAINT FK_integrations_tenant FOREIGN KEY (tenant_id) REFERENCES dbo.tenant  (tenant_id)
);
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'integration_logs')
CREATE TABLE dbo.integration_logs (
    id              UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    integration_id  UNIQUEIDENTIFIER NOT NULL,
    event_type      NVARCHAR(100)    NOT NULL,
    status          NVARCHAR(100)    NOT NULL,
    details         NVARCHAR(MAX)    NULL,  -- JSON
    created_at      DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT PK_integration_logs        PRIMARY KEY (id),
    CONSTRAINT FK_int_logs_integration    FOREIGN KEY (integration_id) REFERENCES dbo.integrations (id) ON DELETE CASCADE
);
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'payment_config')
CREATE TABLE dbo.payment_config (
    id                      UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    tenant_id               UNIQUEIDENTIFIER NOT NULL,
    stripe_enabled          BIT              NOT NULL DEFAULT 0,
    paypal_enabled          BIT              NOT NULL DEFAULT 0,
    default_method          NVARCHAR(50)     NULL DEFAULT 'stripe',
    stripe_publishable_key  NVARCHAR(MAX)    NULL,
    stripe_secret_key       NVARCHAR(MAX)    NULL,
    stripe_webhook_secret   NVARCHAR(MAX)    NULL,
    paypal_client_id        NVARCHAR(MAX)    NULL,
    paypal_secret           NVARCHAR(MAX)    NULL,
    created_at              DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    updated_at              DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT PK_payment_config        PRIMARY KEY (id),
    CONSTRAINT FK_payment_config_tenant FOREIGN KEY (tenant_id) REFERENCES dbo.tenant (tenant_id),
    CONSTRAINT UQ_payment_config_tenant UNIQUE (tenant_id)
);
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'processed_support_emails')
CREATE TABLE dbo.processed_support_emails (
    id              UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    tenant_id       UNIQUEIDENTIFIER NOT NULL,
    email_thread_id NVARCHAR(500)    NOT NULL,
    email_subject   NVARCHAR(MAX)    NULL,
    source_email    NVARCHAR(255)    NULL,
    case_id         UNIQUEIDENTIFIER NULL,
    processed_at    DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT PK_processed_emails        PRIMARY KEY (id),
    CONSTRAINT FK_proc_emails_tenant      FOREIGN KEY (tenant_id) REFERENCES dbo.tenant       (tenant_id),
    CONSTRAINT FK_proc_emails_case        FOREIGN KEY (case_id)   REFERENCES dbo.support_case (case_id),
    CONSTRAINT UQ_proc_emails             UNIQUE (tenant_id, email_thread_id)
);
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'record_comments')
CREATE TABLE dbo.record_comments (
    id          UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    tenant_id   UNIQUEIDENTIFIER NOT NULL,
    user_id     UNIQUEIDENTIFIER NOT NULL,
    entity_type NVARCHAR(50)     NOT NULL,
    entity_id   UNIQUEIDENTIFIER NOT NULL,
    comment     NVARCHAR(MAX)    NOT NULL,
    created_at  DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    updated_at  DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT PK_record_comments        PRIMARY KEY (id),
    CONSTRAINT FK_rc_tenant              FOREIGN KEY (tenant_id) REFERENCES dbo.tenant  (tenant_id),
    CONSTRAINT FK_rc_user                FOREIGN KEY (user_id)   REFERENCES dbo.profile (id)
);
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'saved_searches')
CREATE TABLE dbo.saved_searches (
    id              UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    user_id         UNIQUEIDENTIFIER NOT NULL,
    tenant_id       UNIQUEIDENTIFIER NOT NULL,
    name            NVARCHAR(255)    NOT NULL,
    search_query    NVARCHAR(MAX)    NOT NULL,
    filters         NVARCHAR(MAX)    NULL,  -- JSON
    is_favorite     BIT              NOT NULL DEFAULT 0,
    created_at      DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT PK_saved_searches        PRIMARY KEY (id),
    CONSTRAINT FK_ss_user               FOREIGN KEY (user_id)   REFERENCES dbo.profile (id),
    CONSTRAINT FK_ss_tenant             FOREIGN KEY (tenant_id) REFERENCES dbo.tenant  (tenant_id)
);
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'saved_sql_queries')
CREATE TABLE dbo.saved_sql_queries (
    id          UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    user_id     UNIQUEIDENTIFIER NOT NULL,
    tenant_id   UNIQUEIDENTIFIER NOT NULL,
    name        NVARCHAR(MAX)    NOT NULL,
    query_text  NVARCHAR(MAX)    NOT NULL,
    created_at  DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT PK_saved_sql_queries     PRIMARY KEY (id),
    CONSTRAINT FK_ssq_user              FOREIGN KEY (user_id)   REFERENCES dbo.app_user (id),
    CONSTRAINT FK_ssq_tenant            FOREIGN KEY (tenant_id) REFERENCES dbo.tenant   (tenant_id)
);
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'scheduled_sync_log')
CREATE TABLE dbo.scheduled_sync_log (
    id              UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    sync_type       NVARCHAR(MAX)    NOT NULL,
    tenant_id       UNIQUEIDENTIFIER NULL,
    started_at      DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    completed_at    DATETIMEOFFSET   NULL,
    status          NVARCHAR(50)     NULL DEFAULT 'running',
    records_synced  INT              NULL DEFAULT 0,
    error_message   NVARCHAR(MAX)    NULL,
    created_at      DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT PK_scheduled_sync_log   PRIMARY KEY (id),
    CONSTRAINT FK_ssl_tenant           FOREIGN KEY (tenant_id) REFERENCES dbo.tenant (tenant_id)
);
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'search_history')
CREATE TABLE dbo.search_history (
    id              UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    user_id         UNIQUEIDENTIFIER NOT NULL,
    tenant_id       UNIQUEIDENTIFIER NOT NULL,
    search_query    NVARCHAR(MAX)    NOT NULL,
    result_count    INT              NULL DEFAULT 0,
    created_at      DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT PK_search_history   PRIMARY KEY (id),
    CONSTRAINT FK_sh_user          FOREIGN KEY (user_id)   REFERENCES dbo.profile (id),
    CONSTRAINT FK_sh_tenant        FOREIGN KEY (tenant_id) REFERENCES dbo.tenant  (tenant_id)
);
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'sync_schedules')
CREATE TABLE dbo.sync_schedules (
    id                  UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    tenant_id           UNIQUEIDENTIFIER NOT NULL,
    sync_type           NVARCHAR(100)    NOT NULL,
    is_enabled          BIT              NOT NULL DEFAULT 1,
    interval_minutes    INT              NULL DEFAULT 5,
    last_scheduled_at   DATETIMEOFFSET   NULL,
    created_at          DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    updated_at          DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT PK_sync_schedules   PRIMARY KEY (id),
    CONSTRAINT FK_sync_tenant      FOREIGN KEY (tenant_id) REFERENCES dbo.tenant (tenant_id),
    CONSTRAINT UQ_sync_schedules   UNIQUE (tenant_id, sync_type)
);
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'webhooks')
CREATE TABLE dbo.webhooks (
    id          UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    user_id     UNIQUEIDENTIFIER NOT NULL,
    tenant_id   UNIQUEIDENTIFIER NOT NULL,
    name        NVARCHAR(255)    NOT NULL,
    url         NVARCHAR(MAX)    NOT NULL,
    events      NVARCHAR(MAX)    NOT NULL,  -- JSON array
    is_active   BIT              NOT NULL DEFAULT 1,
    secret_key  NVARCHAR(255)    NULL,
    created_at  DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    updated_at  DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT PK_webhooks        PRIMARY KEY (id),
    CONSTRAINT FK_wh_user         FOREIGN KEY (user_id)   REFERENCES dbo.profile (id),
    CONSTRAINT FK_wh_tenant       FOREIGN KEY (tenant_id) REFERENCES dbo.tenant  (tenant_id)
);
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'workflows')
CREATE TABLE dbo.workflows (
    id              UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    tenant_id       UNIQUEIDENTIFIER NOT NULL,
    name            NVARCHAR(255)    NOT NULL,
    description     NVARCHAR(MAX)    NULL,
    trigger_type    NVARCHAR(100)    NOT NULL,
    entity_type     NVARCHAR(100)    NOT NULL,
    conditions      NVARCHAR(MAX)    NULL,  -- JSON
    actions         NVARCHAR(MAX)    NOT NULL,  -- JSON
    is_active       BIT              NOT NULL DEFAULT 1,
    created_at      DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    updated_at      DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT PK_workflows        PRIMARY KEY (id),
    CONSTRAINT FK_wf_tenant        FOREIGN KEY (tenant_id) REFERENCES dbo.tenant (tenant_id)
);
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'workflow_executions')
CREATE TABLE dbo.workflow_executions (
    id              UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    workflow_id     UNIQUEIDENTIFIER NOT NULL,
    status          NVARCHAR(100)    NOT NULL,
    trigger_data    NVARCHAR(MAX)    NULL,  -- JSON
    result          NVARCHAR(MAX)    NULL,  -- JSON
    error_message   NVARCHAR(MAX)    NULL,
    executed_at     DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT PK_workflow_executions   PRIMARY KEY (id),
    CONSTRAINT FK_wfe_workflow          FOREIGN KEY (workflow_id) REFERENCES dbo.workflows (id) ON DELETE CASCADE
);
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'workflow_event_queue')
CREATE TABLE dbo.workflow_event_queue (
    id          UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    tenant_id   UNIQUEIDENTIFIER NOT NULL,
    entity_type NVARCHAR(50)     NOT NULL,
    entity_id   UNIQUEIDENTIFIER NOT NULL,
    old_record  NVARCHAR(MAX)    NULL,  -- JSON
    new_record  NVARCHAR(MAX)    NULL,  -- JSON
    created_at  DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    processed_at DATETIMEOFFSET  NULL,
    status      NVARCHAR(20)     NULL DEFAULT 'pending',
    CONSTRAINT PK_workflow_event_queue  PRIMARY KEY (id),
    CONSTRAINT FK_weq_tenant            FOREIGN KEY (tenant_id) REFERENCES dbo.tenant (tenant_id)
);
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'impersonation_sessions')
CREATE TABLE dbo.impersonation_sessions (
    id                      UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    admin_user_id           UNIQUEIDENTIFIER NOT NULL,
    impersonated_user_id    UNIQUEIDENTIFIER NOT NULL,
    is_active               BIT              NOT NULL DEFAULT 1,
    created_at              DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    expires_at              DATETIMEOFFSET   NOT NULL DEFAULT DATEADD(HOUR, 2, GETUTCDATE()),
    CONSTRAINT PK_impersonation_sessions        PRIMARY KEY (id),
    CONSTRAINT FK_imp_admin                     FOREIGN KEY (admin_user_id)        REFERENCES dbo.profile (id),
    CONSTRAINT FK_imp_target                    FOREIGN KEY (impersonated_user_id) REFERENCES dbo.profile (id)
);
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'channels')
CREATE TABLE dbo.channels (
    id          UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    tenant_id   UNIQUEIDENTIFIER NOT NULL,
    name        NVARCHAR(255)    NOT NULL,
    description NVARCHAR(MAX)    NULL,
    is_private  BIT              NOT NULL DEFAULT 0,
    created_by  UNIQUEIDENTIFIER NOT NULL,
    created_at  DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT PK_channels        PRIMARY KEY (id),
    CONSTRAINT FK_chan_tenant      FOREIGN KEY (tenant_id)  REFERENCES dbo.tenant  (tenant_id),
    CONSTRAINT FK_chan_creator     FOREIGN KEY (created_by) REFERENCES dbo.profile (id)
);
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'team_messages')
CREATE TABLE dbo.team_messages (
    id          UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    channel_id  UNIQUEIDENTIFIER NOT NULL,
    user_id     UNIQUEIDENTIFIER NOT NULL,
    content     NVARCHAR(MAX)    NOT NULL,
    mentions    NVARCHAR(MAX)    NULL,  -- JSON array of UUIDs
    created_at  DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    updated_at  DATETIMEOFFSET   NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT PK_team_messages     PRIMARY KEY (id),
    CONSTRAINT FK_tm_channel        FOREIGN KEY (channel_id) REFERENCES dbo.channels (id) ON DELETE CASCADE,
    CONSTRAINT FK_tm_user           FOREIGN KEY (user_id)    REFERENCES dbo.profile  (id)
);
GO

-- ============================================================
-- SECTION 32: VIEWS
-- ============================================================

GO
CREATE OR ALTER VIEW dbo.opportunity_pipeline AS
SELECT
    o.tenant_id,
    o.stage,
    COUNT(*)                                            AS [count],
    ISNULL(SUM(o.amount), 0)                            AS total_amount,
    ISNULL(SUM(o.amount * o.probability / 100.0), 0)   AS weighted_amount
FROM dbo.opportunity o
GROUP BY o.tenant_id, o.stage;
GO

CREATE OR ALTER VIEW dbo.unbilled_time_entries AS
SELECT
    te.*,
    p.first_name + ' ' + p.last_name  AS user_name,
    pr.name                             AS project_name,
    a.name                              AS account_name
FROM dbo.time_entry te
JOIN dbo.profile  p  ON p.id           = te.user_id
LEFT JOIN dbo.project pr ON pr.project_id = te.project_id
LEFT JOIN dbo.account a  ON a.account_id  = pr.account_id
WHERE te.invoice_line_id IS NULL
  AND te.billable = 1
  AND te.status   = 'Approved';
GO

CREATE OR ALTER VIEW dbo.user_time_detail AS
SELECT
    te.time_entry_id,
    te.tenant_id,
    te.user_id,
    te.[date],
    te.hours,
    te.billable,
    te.hourly_rate,
    te.notes,
    te.status,
    te.project_id,
    pr.name         AS project_name,
    pr.code         AS project_code,
    a.account_id,
    a.name          AS client_name,
    te.task_id,
    t.name          AS task_name,
    te.invoice_line_id,
    te.hours * te.hourly_rate AS amount,
    te.created_at
FROM dbo.time_entry te
LEFT JOIN dbo.project pr ON pr.project_id = te.project_id
LEFT JOIN dbo.account a  ON a.account_id  = pr.account_id
LEFT JOIN dbo.task    t  ON t.task_id     = te.task_id;
GO

CREATE OR ALTER VIEW dbo.project_time_summary AS
SELECT
    pr.project_id,
    pr.tenant_id,
    pr.name                                             AS project_name,
    pr.code                                             AS project_code,
    COUNT(DISTINCT te.user_id)                          AS team_members,
    ISNULL(SUM(te.hours), 0)                            AS total_hours,
    ISNULL(SUM(CASE WHEN te.billable = 1 THEN te.hours ELSE 0 END), 0)  AS billable_hours,
    ISNULL(SUM(CASE WHEN te.billable = 1 THEN te.hours * te.hourly_rate ELSE 0 END), 0) AS billable_amount,
    pr.budget_hours,
    pr.budget_amount
FROM dbo.project pr
LEFT JOIN dbo.time_entry te ON te.project_id = pr.project_id
GROUP BY pr.project_id, pr.tenant_id, pr.name, pr.code, pr.budget_hours, pr.budget_amount;
GO

CREATE OR ALTER VIEW dbo.weekly_time_summary AS
SELECT
    te.tenant_id,
    te.user_id,
    ts.week_start,
    te.project_id,
    pr.name  AS project_name,
    a.name   AS client_name,
    COUNT(DISTINCT CAST(te.[date] AS DATE))                                         AS days_worked,
    ISNULL(SUM(te.hours), 0)                                                        AS total_hours,
    ISNULL(SUM(CASE WHEN te.billable = 1 THEN te.hours ELSE 0 END), 0)             AS billable_hours,
    ISNULL(SUM(CASE WHEN te.billable = 1 THEN te.hours * te.hourly_rate ELSE 0 END), 0) AS billable_amount
FROM dbo.time_entry te
LEFT JOIN dbo.timesheet ts ON ts.timesheet_id = te.timesheet_id
LEFT JOIN dbo.project  pr ON pr.project_id    = te.project_id
LEFT JOIN dbo.account  a  ON a.account_id     = pr.account_id
GROUP BY te.tenant_id, te.user_id, ts.week_start, te.project_id, pr.name, a.name;
GO

CREATE OR ALTER VIEW dbo.credential_safe AS
SELECT
    credential_id,
    tenant_id,
    contact_id,
    account_id,
    name,
    credential_type,
    credential_number,
    credentials,
    credentials_description,
    cert_id,
    certified_date,
    valid_to,
    status,
    status_reason,
    comments,
    included_in_resume,
    record_created_on,
    salesforce_id,
    salesforce_contact_id,
    salesforce_account_id,
    salesforce_organization_id,
    salesforce_owner_id,
    salesforce_raw,
    created_at,
    updated_at
FROM dbo.credential;
GO

-- ============================================================
-- SECTION 33: STORED PROCEDURES (replaces Supabase RPC functions)
-- ============================================================

-- get_user_tenant
CREATE OR ALTER PROCEDURE dbo.get_user_tenant
    @user_id UNIQUEIDENTIFIER,
    @tenant_id UNIQUEIDENTIFIER OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT @tenant_id = tenant_id
    FROM dbo.profile
    WHERE id = @user_id;
END;
GO

-- get_user_display_info
CREATE OR ALTER PROCEDURE dbo.get_user_display_info
    @user_id UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        p.id,
        p.first_name,
        p.last_name,
        u.email
    FROM dbo.profile p
    JOIN dbo.app_user u ON u.id = p.id
    WHERE p.id = @user_id;
END;
GO

-- get_users_display_info  (pass comma-separated UUIDs as JSON array string)
CREATE OR ALTER PROCEDURE dbo.get_users_display_info
    @user_ids NVARCHAR(MAX)   -- JSON array: '["uuid1","uuid2"]'
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        p.id,
        p.first_name,
        p.last_name,
        u.email
    FROM dbo.profile p
    JOIN dbo.app_user u ON u.id = p.id
    WHERE p.id IN (
        SELECT CAST(value AS UNIQUEIDENTIFIER)
        FROM OPENJSON(@user_ids)
    );
END;
GO

-- is_user_admin
CREATE OR ALTER FUNCTION dbo.is_user_admin(@user_id UNIQUEIDENTIFIER)
RETURNS BIT
AS
BEGIN
    DECLARE @result BIT = 0;
    IF EXISTS (
        SELECT 1 FROM dbo.user_role
        WHERE user_id = @user_id AND role = 'admin'
    )
        SET @result = 1;
    RETURN @result;
END;
GO

-- has_role_in_tenant
CREATE OR ALTER FUNCTION dbo.has_role_in_tenant(
    @user_id   UNIQUEIDENTIFIER,
    @tenant_id UNIQUEIDENTIFIER,
    @role      NVARCHAR(50)
)
RETURNS BIT
AS
BEGIN
    DECLARE @result BIT = 0;
    IF EXISTS (
        SELECT 1 FROM dbo.user_role
        WHERE user_id   = @user_id
          AND tenant_id = @tenant_id
          AND role      = @role
    )
        SET @result = 1;
    RETURN @result;
END;
GO

-- can_approve_time_entries
CREATE OR ALTER FUNCTION dbo.can_approve_time_entries(@user_id UNIQUEIDENTIFIER)
RETURNS BIT
AS
BEGIN
    DECLARE @result BIT = 0;
    IF EXISTS (
        SELECT 1 FROM dbo.user_role
        WHERE user_id = @user_id
          AND role IN ('admin','manager')
    )
        SET @result = 1;
    RETURN @result;
END;
GO

-- get_tenant_users
CREATE OR ALTER PROCEDURE dbo.get_tenant_users
    @tenant_id UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        p.id,
        p.first_name,
        p.last_name,
        p.phone,
        p.is_active,
        u.email,
        ur.role
    FROM dbo.profile p
    JOIN dbo.app_user u  ON u.id        = p.id
    LEFT JOIN dbo.user_role ur ON ur.user_id = p.id AND ur.tenant_id = p.tenant_id
    WHERE p.tenant_id = @tenant_id;
END;
GO

-- generate_entity_number  (thread-safe using sp_getapplock)
CREATE OR ALTER PROCEDURE dbo.generate_entity_number
    @tenant_id   UNIQUEIDENTIFIER,
    @entity_type NVARCHAR(50),
    @prefix      NVARCHAR(20),
    @result      NVARCHAR(50) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @seq INT;

    BEGIN TRANSACTION;

    EXEC sp_getapplock
        @Resource = 'entity_seq',
        @LockMode = 'Exclusive',
        @LockOwner = 'Transaction',
        @LockTimeout = 5000;

    UPDATE dbo.entity_sequences
    SET last_sequence = last_sequence + 1
    WHERE tenant_id   = @tenant_id
      AND entity_type = @entity_type;

    IF @@ROWCOUNT = 0
    BEGIN
        INSERT INTO dbo.entity_sequences (tenant_id, entity_type, last_sequence)
        VALUES (@tenant_id, @entity_type, 1);
        SET @seq = 1;
    END
    ELSE
    BEGIN
        SELECT @seq = last_sequence
        FROM dbo.entity_sequences
        WHERE tenant_id   = @tenant_id
          AND entity_type = @entity_type;
    END;

    COMMIT TRANSACTION;

    SET @result = @prefix + FORMAT(@seq, 'D6');
END;
GO

-- is_user_assigned_to_project
CREATE OR ALTER FUNCTION dbo.is_user_assigned_to_project(
    @project_id UNIQUEIDENTIFIER,
    @user_id    UNIQUEIDENTIFIER
)
RETURNS BIT
AS
BEGIN
    DECLARE @result BIT = 0;
    IF EXISTS (
        SELECT 1 FROM dbo.project_user
        WHERE project_id = @project_id
          AND user_id    = @user_id
    )
        SET @result = 1;
    RETURN @result;
END;
GO

-- get_user_rate
CREATE OR ALTER PROCEDURE dbo.get_user_rate
    @user_id    UNIQUEIDENTIFIER,
    @for_date   DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;
    IF @for_date IS NULL SET @for_date = CAST(GETUTCDATE() AS DATE);

    SELECT TOP 1 hourly_rate
    FROM dbo.user_rate
    WHERE user_id   = @user_id
      AND valid_from <= @for_date
      AND (valid_to IS NULL OR valid_to >= @for_date)
    ORDER BY valid_from DESC;
END;
GO

-- get_effective_rate
CREATE OR ALTER PROCEDURE dbo.get_effective_rate
    @user_id    UNIQUEIDENTIFIER,
    @project_id UNIQUEIDENTIFIER = NULL,
    @case_id    UNIQUEIDENTIFIER = NULL,
    @for_date   DATE             = NULL
AS
BEGIN
    SET NOCOUNT ON;
    IF @for_date IS NULL SET @for_date = CAST(GETUTCDATE() AS DATE);

    -- Project rate overrides user rate
    IF @project_id IS NOT NULL
    BEGIN
        DECLARE @project_rate DECIMAL(10,2);
        SELECT TOP 1 @project_rate = hourly_rate
        FROM dbo.project_rate
        WHERE project_id = @project_id
          AND valid_from <= @for_date
          AND (valid_to IS NULL OR valid_to >= @for_date)
        ORDER BY valid_from DESC;

        IF @project_rate IS NOT NULL
        BEGIN
            SELECT @project_rate AS hourly_rate;
            RETURN;
        END;
    END;

    -- Fall back to user rate
    EXEC dbo.get_user_rate @user_id = @user_id, @for_date = @for_date;
END;
GO

-- ============================================================
-- SECTION 34: SEED DATA - Default Tenant
-- ============================================================

-- Insert a default tenant (Cenergistic)
IF NOT EXISTS (SELECT 1 FROM dbo.tenant WHERE domain = 'cenergistic.com')
BEGIN
    INSERT INTO dbo.tenant (tenant_id, name, domain, plan_type, is_active)
    VALUES (NEWID(), 'Cenergistic', 'cenergistic.com', 'enterprise', 1);
    PRINT 'Default tenant inserted.';
END;
GO

-- ============================================================
-- SECTION 35: DEFAULT ROLE PERMISSIONS SEED
-- ============================================================

-- Seed base role permissions for the default tenant
DECLARE @tid UNIQUEIDENTIFIER;
SELECT TOP 1 @tid = tenant_id FROM dbo.tenant WHERE domain = 'cenergistic.com';

IF @tid IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.role_permissions WHERE tenant_id = @tid)
BEGIN
    INSERT INTO dbo.role_permissions (tenant_id, role, resource, can_create, can_read, can_update, can_delete)
    VALUES
    -- admin gets all
    (@tid,'admin','account',    1,1,1,1),
    (@tid,'admin','contact',    1,1,1,1),
    (@tid,'admin','opportunity',1,1,1,1),
    (@tid,'admin','quote',      1,1,1,1),
    (@tid,'admin','contract',   1,1,1,1),
    (@tid,'admin','project',    1,1,1,1),
    (@tid,'admin','task',       1,1,1,1),
    (@tid,'admin','invoice',    1,1,1,1),
    (@tid,'admin','support_case',1,1,1,1),
    (@tid,'admin','activity',   1,1,1,1),
    -- manager
    (@tid,'manager','account',    1,1,1,0),
    (@tid,'manager','contact',    1,1,1,0),
    (@tid,'manager','opportunity',1,1,1,0),
    (@tid,'manager','quote',      1,1,1,0),
    (@tid,'manager','contract',   1,1,1,0),
    (@tid,'manager','project',    1,1,1,0),
    (@tid,'manager','task',       1,1,1,0),
    (@tid,'manager','invoice',    0,1,0,0),
    (@tid,'manager','support_case',1,1,1,0),
    (@tid,'manager','activity',   1,1,1,0),
    -- user
    (@tid,'user','account',    0,1,0,0),
    (@tid,'user','contact',    0,1,0,0),
    (@tid,'user','opportunity',0,1,0,0),
    (@tid,'user','quote',      0,1,0,0),
    (@tid,'user','contract',   0,1,0,0),
    (@tid,'user','project',    0,1,0,0),
    (@tid,'user','task',       1,1,1,0),
    (@tid,'user','invoice',    0,1,0,0),
    (@tid,'user','support_case',1,1,1,0),
    (@tid,'user','activity',   1,1,1,0);
    PRINT 'Default role permissions seeded.';
END;
GO

PRINT '============================================================';
PRINT 'CENCORE database schema creation complete.';
PRINT 'Tables created: 48';
PRINT 'Views created:  6';
PRINT 'Procedures:     7';
PRINT 'Functions:      4';
PRINT 'Server target:  crg-sql.eei.local';
PRINT '============================================================';
GO
