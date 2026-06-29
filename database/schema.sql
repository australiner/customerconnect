-- Run once against your Azure SQL Database.
-- This stores authentication credentials separately from your existing
-- dbo.SchoolServiceCustomers table (which already holds the parent,
-- student, and AM/PM service details, and is left untouched).

CREATE TABLE dbo.CustomerUsers (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Email NVARCHAR(256) NOT NULL UNIQUE,
    PasswordHash NVARCHAR(256) NULL,          -- NULL for Google-only accounts
    Provider NVARCHAR(20) NOT NULL DEFAULT 'local',  -- 'local' or 'google'
    ProviderId NVARCHAR(256) NULL,             -- Google's account id, if applicable
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);

-- A dedicated, least-privilege login for the app (run as an admin, separately):
-- CREATE LOGIN portal_app WITH PASSWORD = 'use-a-strong-generated-password';
-- CREATE USER portal_app FOR LOGIN portal_app;

GRANT SELECT, INSERT, UPDATE ON dbo.CustomerUsers TO portal_app;
GRANT SELECT ON dbo.SchoolServiceCustomers TO portal_app;
GRANT SELECT ON dbo.ServiceStops TO portal_app;
