-- CreateEnum
CREATE TYPE "ProjectKind" AS ENUM ('SAAS', 'POS', 'WEBSITE', 'WEBAPP', 'INTERNAL', 'SERVICE');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "LifecycleStage" AS ENUM ('IDEA', 'BUILD', 'LAUNCH', 'GROW', 'MAINTAIN', 'SUNSET');

-- CreateEnum
CREATE TYPE "Criticality" AS ENUM ('P1', 'P2', 'P3');

-- CreateEnum
CREATE TYPE "RevenueBasis" AS ENUM ('SUBSCRIPTION', 'LICENCE', 'PROJECT', 'RETAINER', 'INTERNAL');

-- CreateEnum
CREATE TYPE "ComponentType" AS ENUM ('WEB', 'API', 'WORKER', 'DATABASE', 'PAYMENTS', 'AUTH', 'CRON');

-- CreateEnum
CREATE TYPE "CheckType" AS ENUM ('HTTP', 'HEARTBEAT', 'DNS', 'TLS', 'WEBHOOK_FRESHNESS', 'CRON_FRESHNESS', 'INGEST_FRESHNESS');

-- CreateEnum
CREATE TYPE "CheckAuthMode" AS ENUM ('NONE', 'HEADER', 'HMAC');

-- CreateEnum
CREATE TYPE "IngestStatus" AS ENUM ('ACCEPTED', 'PROCESSED', 'FAILED');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('P1', 'P2', 'P3');

-- CreateEnum
CREATE TYPE "AlertState" AS ENUM ('OPEN', 'ACKED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "AlertChannelKind" AS ENUM ('EMAIL', 'WEBHOOK');

-- CreateEnum
CREATE TYPE "MetricGranularity" AS ENUM ('MINUTE', 'HOUR', 'DAY', 'MONTH');

-- CreateEnum
CREATE TYPE "MetricProvenance" AS ENUM ('PROBE', 'PUSH', 'MANUAL', 'DERIVED');

-- CreateEnum
CREATE TYPE "MetricQuality" AS ENUM ('OK', 'STALE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "SubscriptionFactStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "RevenueEventKind" AS ENUM ('PAYMENT', 'REFUND', 'FEE', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'TRIAL', 'PAST_DUE', 'SUSPENDED', 'CHURNED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PiiClass" AS ENUM ('NONE', 'CONTACT', 'SENSITIVE');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "OpsTaskStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'BLOCKED', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AssetKind" AS ENUM ('DOMAIN', 'TLS', 'HOSTING', 'LICENCE', 'API_KEY', 'OTHER');

-- CreateEnum
CREATE TYPE "OpsRole" AS ENUM ('OWNER', 'ADMIN', 'ANALYST', 'SUPPORT');

-- CreateEnum
CREATE TYPE "OpsOperatorStatus" AS ENUM ('ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "AuditActorType" AS ENUM ('OPERATOR', 'SYSTEM', 'PRODUCT');

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "ProjectKind" NOT NULL,
    "status" "ProjectStatus" NOT NULL DEFAULT 'ACTIVE',
    "lifecycleStage" "LifecycleStage" NOT NULL DEFAULT 'BUILD',
    "description" TEXT,
    "ownerOperatorId" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'GHS',
    "timezone" TEXT NOT NULL DEFAULT 'Africa/Accra',
    "homepageUrl" TEXT,
    "repoUrl" TEXT,
    "docsUrl" TEXT,
    "supportUrl" TEXT,
    "criticality" "Criticality" NOT NULL DEFAULT 'P2',
    "revenueBasis" "RevenueBasis" NOT NULL DEFAULT 'PROJECT',
    "firstValueEvent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectComponent" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ComponentType" NOT NULL,
    "criticality" "Criticality" NOT NULL DEFAULT 'P2',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectServiceToken" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "tokenPrefix" TEXT NOT NULL,
    "scopes" TEXT[],
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "ProjectServiceToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectCheck" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "type" "CheckType" NOT NULL,
    "targetUrl" TEXT,
    "method" TEXT,
    "expectedStatus" INTEGER,
    "expectedBodyContains" TEXT,
    "timeoutMs" INTEGER NOT NULL DEFAULT 5000,
    "intervalSec" INTEGER NOT NULL DEFAULT 60,
    "latencyBudgetMs" INTEGER,
    "authMode" "CheckAuthMode" NOT NULL DEFAULT 'NONE',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
    "lastRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProbeRun" (
    "id" TEXT NOT NULL,
    "checkId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "finishedAt" TIMESTAMP(3) NOT NULL,
    "ok" BOOLEAN NOT NULL,
    "statusCode" INTEGER,
    "latencyMs" INTEGER,
    "errorClass" TEXT,
    "responseHash" TEXT,
    "tlsExpiresAt" TIMESTAMP(3),
    "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProbeRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IngestEvent" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "sourceEventId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "status" "IngestStatus" NOT NULL DEFAULT 'ACCEPTED',
    "error" TEXT,

    CONSTRAINT "IngestEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "componentId" TEXT,
    "checkId" TEXT,
    "type" TEXT NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "state" "AlertState" NOT NULL DEFAULT 'OPEN',
    "dedupeKey" TEXT NOT NULL,
    "openDedupeKey" TEXT,
    "title" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ackedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "taskId" TEXT,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlertChannel" (
    "id" TEXT NOT NULL,
    "projectId" TEXT,
    "kind" "AlertChannelKind" NOT NULL,
    "targetCipher" TEXT NOT NULL,
    "severities" TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlertChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetricSnapshot" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "componentId" TEXT,
    "metricKey" TEXT NOT NULL,
    "value" DECIMAL(20,6) NOT NULL,
    "unit" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "granularity" "MetricGranularity" NOT NULL,
    "dimension" JSONB,
    "dimensionHash" TEXT NOT NULL DEFAULT '',
    "provenance" "MetricProvenance" NOT NULL,
    "sourceRef" TEXT,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "quality" "MetricQuality" NOT NULL DEFAULT 'OK',

    CONSTRAINT "MetricSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionFact" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "tenantRef" TEXT NOT NULL,
    "planKey" TEXT NOT NULL,
    "status" "SubscriptionFactStatus" NOT NULL,
    "mrrMinor" BIGINT NOT NULL,
    "currency" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "units" INTEGER,
    "provenance" "MetricProvenance" NOT NULL,
    "sourceEventId" TEXT,
    "observedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionFact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RevenueEvent" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "tenantRef" TEXT,
    "kind" "RevenueEventKind" NOT NULL,
    "amountMinor" BIGINT NOT NULL,
    "currency" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "reference" TEXT NOT NULL,
    "provenance" "MetricProvenance" NOT NULL,
    "sourceEventId" TEXT,

    CONSTRAINT "RevenueEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantRef" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "status" "TenantStatus" NOT NULL DEFAULT 'ACTIVE',
    "planKey" TEXT,
    "region" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3),
    "piiClass" "PiiClass" NOT NULL DEFAULT 'NONE',
    "sourceUrl" TEXT,
    "cachedSummary" JSONB,

    CONSTRAINT "TenantRef_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "contactHash" TEXT NOT NULL,
    "contactKind" TEXT NOT NULL,
    "company" TEXT,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "valueMinor" BIGINT,
    "currency" TEXT NOT NULL DEFAULT 'GHS',
    "ownerOperatorId" TEXT,
    "consentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpsTask" (
    "id" TEXT NOT NULL,
    "projectId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "OpsTaskStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "Criticality" NOT NULL DEFAULT 'P2',
    "assigneeOperatorId" TEXT,
    "dueAt" TIMESTAMP(3),
    "entityType" TEXT,
    "entityId" TEXT,
    "alertId" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "cancelReason" TEXT,

    CONSTRAINT "OpsTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignAttribution" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "campaign" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "affiliateCode" TEXT,
    "conversionRef" TEXT NOT NULL,
    "amountMinor" BIGINT NOT NULL,
    "currency" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "provenance" "MetricProvenance" NOT NULL,
    "sourceEventId" TEXT,

    CONSTRAINT "CampaignAttribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "kind" "AssetKind" NOT NULL,
    "name" TEXT NOT NULL,
    "identifier" TEXT,
    "expiresAt" TIMESTAMP(3),
    "renewalCostMinor" BIGINT,
    "currency" TEXT,
    "ownerOperatorId" TEXT,
    "notes" TEXT,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpsOperator" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "OpsRole" NOT NULL,
    "status" "OpsOperatorStatus" NOT NULL DEFAULT 'ACTIVE',
    "passwordHash" TEXT,
    "sessionVersion" INTEGER NOT NULL DEFAULT 0,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OpsOperator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordReset" (
    "id" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordReset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperatorProjectPin" (
    "operatorId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OperatorProjectPin_pkey" PRIMARY KEY ("operatorId","projectId")
);

-- CreateTable
CREATE TABLE "OperatorProjectRecent" (
    "operatorId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "visitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OperatorProjectRecent_pkey" PRIMARY KEY ("operatorId","projectId")
);

-- CreateTable
CREATE TABLE "AuditActivity" (
    "id" TEXT NOT NULL,
    "actorType" "AuditActorType" NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "projectId" TEXT,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "meta" JSONB,
    "ipHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Project_key_key" ON "Project"("key");

-- CreateIndex
CREATE INDEX "Project_status_lifecycleStage_idx" ON "Project"("status", "lifecycleStage");

-- CreateIndex
CREATE INDEX "ProjectComponent_projectId_type_idx" ON "ProjectComponent"("projectId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectComponent_projectId_key_key" ON "ProjectComponent"("projectId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectServiceToken_tokenHash_key" ON "ProjectServiceToken"("tokenHash");

-- CreateIndex
CREATE INDEX "ProjectServiceToken_projectId_idx" ON "ProjectServiceToken"("projectId");

-- CreateIndex
CREATE INDEX "ProjectCheck_active_intervalSec_idx" ON "ProjectCheck"("active", "intervalSec");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectCheck_projectId_key_key" ON "ProjectCheck"("projectId", "key");

-- CreateIndex
CREATE INDEX "ProbeRun_projectId_startedAt_idx" ON "ProbeRun"("projectId", "startedAt" DESC);

-- CreateIndex
CREATE INDEX "ProbeRun_checkId_startedAt_idx" ON "ProbeRun"("checkId", "startedAt" DESC);

-- CreateIndex
CREATE INDEX "IngestEvent_projectId_receivedAt_idx" ON "IngestEvent"("projectId", "receivedAt" DESC);

-- CreateIndex
CREATE INDEX "IngestEvent_status_receivedAt_idx" ON "IngestEvent"("status", "receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "IngestEvent_projectId_sourceEventId_key" ON "IngestEvent"("projectId", "sourceEventId");

-- CreateIndex
CREATE INDEX "Alert_projectId_state_severity_idx" ON "Alert"("projectId", "state", "severity");

-- CreateIndex
CREATE UNIQUE INDEX "Alert_projectId_openDedupeKey_key" ON "Alert"("projectId", "openDedupeKey");

-- CreateIndex
CREATE INDEX "AlertChannel_projectId_active_idx" ON "AlertChannel"("projectId", "active");

-- CreateIndex
CREATE INDEX "MetricSnapshot_projectId_metricKey_periodStart_idx" ON "MetricSnapshot"("projectId", "metricKey", "periodStart" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "MetricSnapshot_projectId_metricKey_periodStart_periodEnd_di_key" ON "MetricSnapshot"("projectId", "metricKey", "periodStart", "periodEnd", "dimensionHash");

-- CreateIndex
CREATE INDEX "SubscriptionFact_projectId_periodStart_status_idx" ON "SubscriptionFact"("projectId", "periodStart", "status");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionFact_projectId_tenantRef_periodStart_key" ON "SubscriptionFact"("projectId", "tenantRef", "periodStart");

-- CreateIndex
CREATE INDEX "RevenueEvent_projectId_occurredAt_idx" ON "RevenueEvent"("projectId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "RevenueEvent_projectId_reference_key" ON "RevenueEvent"("projectId", "reference");

-- CreateIndex
CREATE INDEX "TenantRef_projectId_status_idx" ON "TenantRef"("projectId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "TenantRef_projectId_externalId_key" ON "TenantRef"("projectId", "externalId");

-- CreateIndex
CREATE INDEX "Lead_projectId_status_idx" ON "Lead"("projectId", "status");

-- CreateIndex
CREATE INDEX "Lead_contactHash_idx" ON "Lead"("contactHash");

-- CreateIndex
CREATE INDEX "OpsTask_projectId_status_dueAt_idx" ON "OpsTask"("projectId", "status", "dueAt");

-- CreateIndex
CREATE INDEX "OpsTask_assigneeOperatorId_status_idx" ON "OpsTask"("assigneeOperatorId", "status");

-- CreateIndex
CREATE INDEX "CampaignAttribution_projectId_occurredAt_idx" ON "CampaignAttribution"("projectId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignAttribution_projectId_conversionRef_campaign_key" ON "CampaignAttribution"("projectId", "conversionRef", "campaign");

-- CreateIndex
CREATE INDEX "Asset_projectId_expiresAt_idx" ON "Asset"("projectId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "OpsOperator_email_key" ON "OpsOperator"("email");

-- CreateIndex
CREATE INDEX "OpsOperator_status_role_idx" ON "OpsOperator"("status", "role");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordReset_tokenHash_key" ON "PasswordReset"("tokenHash");

-- CreateIndex
CREATE INDEX "OperatorProjectRecent_operatorId_visitedAt_idx" ON "OperatorProjectRecent"("operatorId", "visitedAt" DESC);

-- CreateIndex
CREATE INDEX "AuditActivity_projectId_createdAt_idx" ON "AuditActivity"("projectId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "AuditActivity_actorId_createdAt_idx" ON "AuditActivity"("actorId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_ownerOperatorId_fkey" FOREIGN KEY ("ownerOperatorId") REFERENCES "OpsOperator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectComponent" ADD CONSTRAINT "ProjectComponent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectServiceToken" ADD CONSTRAINT "ProjectServiceToken_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectCheck" ADD CONSTRAINT "ProjectCheck_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectCheck" ADD CONSTRAINT "ProjectCheck_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "ProjectComponent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProbeRun" ADD CONSTRAINT "ProbeRun_checkId_fkey" FOREIGN KEY ("checkId") REFERENCES "ProjectCheck"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProbeRun" ADD CONSTRAINT "ProbeRun_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngestEvent" ADD CONSTRAINT "IngestEvent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "ProjectComponent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_checkId_fkey" FOREIGN KEY ("checkId") REFERENCES "ProjectCheck"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertChannel" ADD CONSTRAINT "AlertChannel_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetricSnapshot" ADD CONSTRAINT "MetricSnapshot_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetricSnapshot" ADD CONSTRAINT "MetricSnapshot_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "ProjectComponent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionFact" ADD CONSTRAINT "SubscriptionFact_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevenueEvent" ADD CONSTRAINT "RevenueEvent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantRef" ADD CONSTRAINT "TenantRef_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpsTask" ADD CONSTRAINT "OpsTask_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignAttribution" ADD CONSTRAINT "CampaignAttribution_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordReset" ADD CONSTRAINT "PasswordReset_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "OpsOperator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperatorProjectPin" ADD CONSTRAINT "OperatorProjectPin_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "OpsOperator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperatorProjectPin" ADD CONSTRAINT "OperatorProjectPin_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperatorProjectRecent" ADD CONSTRAINT "OperatorProjectRecent_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "OpsOperator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperatorProjectRecent" ADD CONSTRAINT "OperatorProjectRecent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

