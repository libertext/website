-- CreateEnum
CREATE TYPE "VerificationPurpose" AS ENUM ('EMAIL_VERIFY', 'PASSWORD_RESET', 'TEAM_INVITE');

-- CreateEnum
CREATE TYPE "WorkspaceRole" AS ENUM ('OWNER', 'ADMIN', 'EDITOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "WordPressConnectionMode" AS ENUM ('PLUGIN', 'APP_PASSWORD');

-- CreateEnum
CREATE TYPE "ConnectionHealth" AS ENUM ('CONNECTED', 'DEGRADED', 'ERROR', 'DISCONNECTED');

-- CreateEnum
CREATE TYPE "ArticleStatus" AS ENUM ('LOCAL_DRAFT', 'GENERATING', 'GENERATED', 'EDITING', 'READY', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'WP_DRAFT', 'WP_SCHEDULED', 'WP_PUBLISHED', 'WP_FAILED');

-- CreateEnum
CREATE TYPE "SearchIntent" AS ENUM ('INFORMATIONAL', 'COMMERCIAL', 'TRANSACTIONAL', 'NAVIGATIONAL', 'LOCAL', 'MIXED');

-- CreateEnum
CREATE TYPE "FactReviewStatus" AS ENUM ('NOT_REQUIRED', 'PASS', 'WARNING', 'REVIEW_REQUIRED');

-- CreateEnum
CREATE TYPE "ArticleVersionSource" AS ENUM ('AI_GENERATION', 'USER_EDIT', 'AI_REWRITE', 'IMPORT', 'WORDPRESS_SYNC');

-- CreateEnum
CREATE TYPE "KeywordKind" AS ENUM ('PRIMARY', 'SECONDARY');

-- CreateEnum
CREATE TYPE "GenerationJobType" AS ENUM ('RESEARCH', 'BRIEF', 'OUTLINE', 'DRAFT', 'SEO_REVIEW', 'FACT_REVIEW', 'REWRITE', 'META', 'INTERNAL_LINK', 'TITLE');

-- CreateEnum
CREATE TYPE "GenerationJobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "QualityTier" AS ENUM ('ECONOMY', 'BALANCED', 'PREMIUM');

-- CreateEnum
CREATE TYPE "SpeedTier" AS ENUM ('SLOW', 'MEDIUM', 'FAST');

-- CreateEnum
CREATE TYPE "UsageStatus" AS ENUM ('SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "CreditTxnType" AS ENUM ('PURCHASE', 'MONTHLY_GRANT', 'GENERATION', 'REFUND', 'ADMIN_ADJUSTMENT', 'BONUS', 'EXPIRATION');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELED', 'TRIALING', 'INCOMPLETE');

-- CreateEnum
CREATE TYPE "BulkJobStatus" AS ENUM ('PENDING', 'RUNNING', 'PAUSED', 'COMPLETED', 'PARTIALLY_COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BulkItemStatus" AS ENUM ('QUEUED', 'RESEARCHING', 'GENERATING', 'REVIEWING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "image" TEXT,
    "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "purpose" "VerificationPurpose" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "primaryUse" TEXT,
    "contentLang" TEXT NOT NULL DEFAULT 'tr',
    "targetCountry" TEXT NOT NULL DEFAULT 'TR',
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Istanbul',
    "planId" TEXT,
    "onboardingState" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceMember" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "WorkspaceRole" NOT NULL DEFAULT 'VIEWER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspaceMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceInvite" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "WorkspaceRole" NOT NULL DEFAULT 'EDITOR',
    "tokenHash" TEXT NOT NULL,
    "invitedById" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspaceInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "wordpressSiteId" TEXT,
    "language" TEXT NOT NULL DEFAULT 'tr',
    "targetCountry" TEXT NOT NULL DEFAULT 'TR',
    "targetAudience" TEXT,
    "niche" TEXT,
    "isYMYL" BOOLEAN NOT NULL DEFAULT false,
    "autoPublishYMYL" BOOLEAN NOT NULL DEFAULT false,
    "preferredProvider" TEXT,
    "preferredModelId" TEXT,
    "fallbackModelId" TEXT,
    "defaultAuthorId" TEXT,
    "defaultCategoryId" TEXT,
    "defaultPublishMode" TEXT NOT NULL DEFAULT 'LOCAL_DRAFT',
    "customInstructions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WritingProfile" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "brandName" TEXT,
    "aboutSite" TEXT,
    "authorName" TEXT,
    "authorTitle" TEXT,
    "authorBio" TEXT,
    "authorExpertise" TEXT,
    "authorProfileUrl" TEXT,
    "audience" TEXT,
    "purpose" TEXT,
    "tone" TEXT,
    "formality" TEXT,
    "addressing" TEXT,
    "avoidPhrases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "bannedWords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "preferredTerms" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "cta" TEXT,
    "sampleTexts" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "verifiedFacts" TEXT,
    "productInfo" TEXT,
    "disclaimer" TEXT,
    "sourcePolicy" TEXT,
    "linkPolicy" TEXT,
    "aiDisclosure" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WritingProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentTemplate" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "systemInstruction" TEXT,
    "outlineRules" TEXT,
    "headingRules" TEXT,
    "cta" TEXT,
    "tone" TEXT,
    "requiresResearch" BOOLEAN NOT NULL DEFAULT false,
    "requiresFaq" BOOLEAN NOT NULL DEFAULT false,
    "lengthPreference" TEXT NOT NULL DEFAULT 'STANDARD',
    "sourcePolicy" TEXT,
    "wordpressDefaults" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WordPressSite" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mode" "WordPressConnectionMode" NOT NULL DEFAULT 'PLUGIN',
    "health" "ConnectionHealth" NOT NULL DEFAULT 'DISCONNECTED',
    "encryptedSecret" TEXT,
    "connectionId" TEXT,
    "detectedSeoPlugin" TEXT,
    "wpVersion" TEXT,
    "siteTimezone" TEXT,
    "siteLanguage" TEXT,
    "pluginVersion" TEXT,
    "lastSyncAt" TIMESTAMP(3),
    "lastHealthyAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "WordPressSite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WordPressPairing" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WordPressPairing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WordPressAuthor" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "externalId" INTEGER NOT NULL,
    "displayName" TEXT NOT NULL,
    "slug" TEXT,
    "email" TEXT,

    CONSTRAINT "WordPressAuthor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WordPressCategory" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "externalId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "parentId" INTEGER,

    CONSTRAINT "WordPressCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WordPressTag" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "externalId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT,

    CONSTRAINT "WordPressTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WordPressPostIndex" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "externalId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT,
    "excerpt" TEXT,
    "url" TEXT NOT NULL,
    "categoryIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "tagIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "fingerprint" TEXT,
    "publishedAt" TIMESTAMP(3),
    "modifiedAt" TIMESTAMP(3),
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WordPressPostIndex_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Article" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "projectId" TEXT,
    "wordpressSiteId" TEXT,
    "createdById" TEXT,
    "title" TEXT NOT NULL DEFAULT '',
    "slug" TEXT,
    "excerpt" TEXT,
    "contentHtml" TEXT NOT NULL DEFAULT '',
    "status" "ArticleStatus" NOT NULL DEFAULT 'LOCAL_DRAFT',
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "canonicalUrl" TEXT,
    "focusKeyword" TEXT,
    "searchIntent" "SearchIntent",
    "userNeedSummary" TEXT,
    "faq" JSONB,
    "sources" JSONB,
    "seoScore" INTEGER,
    "factReviewStatus" "FactReviewStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
    "qualityWarnings" JSONB,
    "wpPostId" INTEGER,
    "wpPermalink" TEXT,
    "wpStatus" TEXT,
    "wpAuthorId" INTEGER,
    "wpCategoryIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "wpTagIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "wpFeaturedMediaId" INTEGER,
    "scheduledAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "wpModifiedAt" TIMESTAMP(3),
    "lastPublishedVersionId" TEXT,
    "bulkJobItemId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArticleVersion" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "source" "ArticleVersionSource" NOT NULL,
    "title" TEXT NOT NULL,
    "contentHtml" TEXT NOT NULL,
    "metadata" JSONB,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArticleVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArticleKeyword" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "kind" "KeywordKind" NOT NULL DEFAULT 'SECONDARY',

    CONSTRAINT "ArticleKeyword_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArticleSource" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "domain" TEXT,
    "publicationDate" TIMESTAMP(3),
    "retrievedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "relevantExcerpt" TEXT,
    "sourceType" TEXT,
    "selected" BOOLEAN NOT NULL DEFAULT true,
    "credibilityNote" TEXT,

    CONSTRAINT "ArticleSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArticleMedia" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'image',
    "storageKey" TEXT,
    "url" TEXT,
    "altText" TEXT,
    "caption" TEXT,
    "source" TEXT,
    "generationPrompt" TEXT,
    "wpMediaId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArticleMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InternalLinkSuggestion" (
    "id" TEXT NOT NULL,
    "sourceArticleId" TEXT NOT NULL,
    "targetPostId" INTEGER NOT NULL,
    "targetUrl" TEXT NOT NULL,
    "targetTitle" TEXT NOT NULL,
    "suggestedAnchor" TEXT NOT NULL,
    "context" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "accepted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InternalLinkSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GenerationJob" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "articleId" TEXT,
    "bulkJobItemId" TEXT,
    "type" "GenerationJobType" NOT NULL,
    "provider" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "promptVersion" TEXT,
    "status" "GenerationJobStatus" NOT NULL DEFAULT 'PENDING',
    "attempt" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "errorCode" TEXT,
    "queueJobId" TEXT,
    "input" JSONB,
    "output" JSONB,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GenerationJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIProviderConfig" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "concurrency" INTEGER NOT NULL DEFAULT 4,
    "health" TEXT NOT NULL DEFAULT 'unknown',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIProviderConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIModel" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "externalModelId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "supportsStreaming" BOOLEAN NOT NULL DEFAULT false,
    "supportsStructured" BOOLEAN NOT NULL DEFAULT true,
    "supportsVision" BOOLEAN NOT NULL DEFAULT false,
    "supportsWebSearch" BOOLEAN NOT NULL DEFAULT false,
    "contextWindow" INTEGER NOT NULL DEFAULT 128000,
    "maxOutputTokens" INTEGER NOT NULL DEFAULT 8192,
    "inputPricePerMTok" INTEGER NOT NULL DEFAULT 0,
    "outputPricePerMTok" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "defaultForArticle" BOOLEAN NOT NULL DEFAULT false,
    "defaultForResearch" BOOLEAN NOT NULL DEFAULT false,
    "qualityTier" "QualityTier" NOT NULL DEFAULT 'BALANCED',
    "speedTier" "SpeedTier" NOT NULL DEFAULT 'MEDIUM',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "deprecated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserProviderCredential" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "label" TEXT,
    "encryptedKey" TEXT NOT NULL,
    "keyLast4" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastValidatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserProviderCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIUsage" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT,
    "articleId" TEXT,
    "generationJobId" TEXT,
    "provider" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "modelDisplayName" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "cachedInputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "reasoningTokens" INTEGER NOT NULL DEFAULT 0,
    "estimatedProviderCostMicro" INTEGER NOT NULL DEFAULT 0,
    "chargedCredits" INTEGER NOT NULL DEFAULT 0,
    "status" "UsageStatus" NOT NULL DEFAULT 'SUCCESS',
    "errorCode" TEXT,
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditAccount" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreditAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditTransaction" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "type" "CreditTxnType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "description" TEXT,
    "generationJobId" TEXT,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priceMinor" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "interval" TEXT NOT NULL DEFAULT 'month',
    "monthlyCredits" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanFeature" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "PlanFeature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "provider" TEXT NOT NULL DEFAULT 'mock',
    "externalId" TEXT,
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BulkJob" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "projectId" TEXT,
    "createdById" TEXT,
    "name" TEXT NOT NULL,
    "status" "BulkJobStatus" NOT NULL DEFAULT 'PENDING',
    "provider" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "publishMode" TEXT NOT NULL DEFAULT 'LOCAL_DRAFT',
    "scheduleConfig" JSONB,
    "totalItems" INTEGER NOT NULL DEFAULT 0,
    "completedItems" INTEGER NOT NULL DEFAULT 0,
    "failedItems" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BulkJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BulkJobItem" (
    "id" TEXT NOT NULL,
    "bulkJobId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "topic" TEXT NOT NULL,
    "primaryKeyword" TEXT,
    "secondaryKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "categoryExternalId" INTEGER,
    "authorExternalId" INTEGER,
    "publishMode" TEXT,
    "publishAt" TIMESTAMP(3),
    "customInstruction" TEXT,
    "status" "BulkItemStatus" NOT NULL DEFAULT 'QUEUED',
    "error" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BulkJobItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "metadata" JSONB,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "externalId" TEXT,
    "signatureOk" BOOLEAN NOT NULL DEFAULT false,
    "processedAt" TIMESTAMP(3),
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureFlag" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureFlagOverride" (
    "id" TEXT NOT NULL,
    "flagId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL,

    CONSTRAINT "FeatureFlagOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromptTemplate" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromptTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromptVersion" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "system" TEXT NOT NULL,
    "userTemplate" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromptVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "readAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_tokenHash_key" ON "VerificationToken"("tokenHash");

-- CreateIndex
CREATE INDEX "VerificationToken_email_purpose_idx" ON "VerificationToken"("email", "purpose");

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_slug_key" ON "Workspace"("slug");

-- CreateIndex
CREATE INDEX "Workspace_slug_idx" ON "Workspace"("slug");

-- CreateIndex
CREATE INDEX "WorkspaceMember_userId_idx" ON "WorkspaceMember"("userId");

-- CreateIndex
CREATE INDEX "WorkspaceMember_workspaceId_idx" ON "WorkspaceMember"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceMember_workspaceId_userId_key" ON "WorkspaceMember"("workspaceId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceInvite_tokenHash_key" ON "WorkspaceInvite"("tokenHash");

-- CreateIndex
CREATE INDEX "WorkspaceInvite_workspaceId_idx" ON "WorkspaceInvite"("workspaceId");

-- CreateIndex
CREATE INDEX "WorkspaceInvite_email_idx" ON "WorkspaceInvite"("email");

-- CreateIndex
CREATE INDEX "Project_workspaceId_idx" ON "Project"("workspaceId");

-- CreateIndex
CREATE INDEX "Project_wordpressSiteId_idx" ON "Project"("wordpressSiteId");

-- CreateIndex
CREATE UNIQUE INDEX "WritingProfile_projectId_key" ON "WritingProfile"("projectId");

-- CreateIndex
CREATE INDEX "ContentTemplate_workspaceId_idx" ON "ContentTemplate"("workspaceId");

-- CreateIndex
CREATE INDEX "WordPressSite_workspaceId_idx" ON "WordPressSite"("workspaceId");

-- CreateIndex
CREATE INDEX "WordPressSite_health_idx" ON "WordPressSite"("health");

-- CreateIndex
CREATE UNIQUE INDEX "WordPressPairing_siteId_key" ON "WordPressPairing"("siteId");

-- CreateIndex
CREATE UNIQUE INDEX "WordPressPairing_codeHash_key" ON "WordPressPairing"("codeHash");

-- CreateIndex
CREATE INDEX "WordPressAuthor_siteId_idx" ON "WordPressAuthor"("siteId");

-- CreateIndex
CREATE UNIQUE INDEX "WordPressAuthor_siteId_externalId_key" ON "WordPressAuthor"("siteId", "externalId");

-- CreateIndex
CREATE INDEX "WordPressCategory_siteId_idx" ON "WordPressCategory"("siteId");

-- CreateIndex
CREATE UNIQUE INDEX "WordPressCategory_siteId_externalId_key" ON "WordPressCategory"("siteId", "externalId");

-- CreateIndex
CREATE INDEX "WordPressTag_siteId_idx" ON "WordPressTag"("siteId");

-- CreateIndex
CREATE UNIQUE INDEX "WordPressTag_siteId_externalId_key" ON "WordPressTag"("siteId", "externalId");

-- CreateIndex
CREATE INDEX "WordPressPostIndex_siteId_idx" ON "WordPressPostIndex"("siteId");

-- CreateIndex
CREATE INDEX "WordPressPostIndex_slug_idx" ON "WordPressPostIndex"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "WordPressPostIndex_siteId_externalId_key" ON "WordPressPostIndex"("siteId", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Article_bulkJobItemId_key" ON "Article"("bulkJobItemId");

-- CreateIndex
CREATE INDEX "Article_workspaceId_status_idx" ON "Article"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "Article_projectId_idx" ON "Article"("projectId");

-- CreateIndex
CREATE INDEX "Article_wordpressSiteId_idx" ON "Article"("wordpressSiteId");

-- CreateIndex
CREATE INDEX "Article_createdAt_idx" ON "Article"("createdAt");

-- CreateIndex
CREATE INDEX "Article_wpPostId_idx" ON "Article"("wpPostId");

-- CreateIndex
CREATE INDEX "Article_scheduledAt_idx" ON "Article"("scheduledAt");

-- CreateIndex
CREATE INDEX "ArticleVersion_articleId_createdAt_idx" ON "ArticleVersion"("articleId", "createdAt");

-- CreateIndex
CREATE INDEX "ArticleKeyword_articleId_idx" ON "ArticleKeyword"("articleId");

-- CreateIndex
CREATE INDEX "ArticleSource_articleId_idx" ON "ArticleSource"("articleId");

-- CreateIndex
CREATE INDEX "ArticleMedia_articleId_idx" ON "ArticleMedia"("articleId");

-- CreateIndex
CREATE INDEX "InternalLinkSuggestion_sourceArticleId_idx" ON "InternalLinkSuggestion"("sourceArticleId");

-- CreateIndex
CREATE INDEX "GenerationJob_workspaceId_idx" ON "GenerationJob"("workspaceId");

-- CreateIndex
CREATE INDEX "GenerationJob_articleId_idx" ON "GenerationJob"("articleId");

-- CreateIndex
CREATE INDEX "GenerationJob_status_idx" ON "GenerationJob"("status");

-- CreateIndex
CREATE UNIQUE INDEX "AIProviderConfig_provider_key" ON "AIProviderConfig"("provider");

-- CreateIndex
CREATE INDEX "AIModel_provider_idx" ON "AIModel"("provider");

-- CreateIndex
CREATE UNIQUE INDEX "AIModel_provider_externalModelId_key" ON "AIModel"("provider", "externalModelId");

-- CreateIndex
CREATE INDEX "UserProviderCredential_workspaceId_idx" ON "UserProviderCredential"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "UserProviderCredential_workspaceId_provider_key" ON "UserProviderCredential"("workspaceId", "provider");

-- CreateIndex
CREATE INDEX "AIUsage_workspaceId_idx" ON "AIUsage"("workspaceId");

-- CreateIndex
CREATE INDEX "AIUsage_provider_modelId_idx" ON "AIUsage"("provider", "modelId");

-- CreateIndex
CREATE INDEX "AIUsage_startedAt_idx" ON "AIUsage"("startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CreditAccount_workspaceId_key" ON "CreditAccount"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "CreditTransaction_idempotencyKey_key" ON "CreditTransaction"("idempotencyKey");

-- CreateIndex
CREATE INDEX "CreditTransaction_workspaceId_createdAt_idx" ON "CreditTransaction"("workspaceId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_key_key" ON "Plan"("key");

-- CreateIndex
CREATE UNIQUE INDEX "PlanFeature_planId_key_key" ON "PlanFeature"("planId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_workspaceId_key" ON "Subscription"("workspaceId");

-- CreateIndex
CREATE INDEX "BulkJob_workspaceId_status_idx" ON "BulkJob"("workspaceId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "BulkJobItem_idempotencyKey_key" ON "BulkJobItem"("idempotencyKey");

-- CreateIndex
CREATE INDEX "BulkJobItem_bulkJobId_status_idx" ON "BulkJobItem"("bulkJobId", "status");

-- CreateIndex
CREATE INDEX "AuditLog_workspaceId_createdAt_idx" ON "AuditLog"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "WebhookEvent_source_eventType_idx" ON "WebhookEvent"("source", "eventType");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookEvent_source_externalId_key" ON "WebhookEvent"("source", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureFlag_key_key" ON "FeatureFlag"("key");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureFlagOverride_flagId_workspaceId_key" ON "FeatureFlagOverride"("flagId", "workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "PromptTemplate_key_key" ON "PromptTemplate"("key");

-- CreateIndex
CREATE UNIQUE INDEX "PromptVersion_templateId_version_key" ON "PromptVersion"("templateId", "version");

-- CreateIndex
CREATE INDEX "Notification_workspaceId_userId_idx" ON "Notification"("workspaceId", "userId");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationToken" ADD CONSTRAINT "VerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceInvite" ADD CONSTRAINT "WorkspaceInvite_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_wordpressSiteId_fkey" FOREIGN KEY ("wordpressSiteId") REFERENCES "WordPressSite"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WritingProfile" ADD CONSTRAINT "WritingProfile_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentTemplate" ADD CONSTRAINT "ContentTemplate_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WordPressSite" ADD CONSTRAINT "WordPressSite_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WordPressPairing" ADD CONSTRAINT "WordPressPairing_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "WordPressSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WordPressAuthor" ADD CONSTRAINT "WordPressAuthor_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "WordPressSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WordPressCategory" ADD CONSTRAINT "WordPressCategory_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "WordPressSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WordPressTag" ADD CONSTRAINT "WordPressTag_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "WordPressSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WordPressPostIndex" ADD CONSTRAINT "WordPressPostIndex_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "WordPressSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_wordpressSiteId_fkey" FOREIGN KEY ("wordpressSiteId") REFERENCES "WordPressSite"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_bulkJobItemId_fkey" FOREIGN KEY ("bulkJobItemId") REFERENCES "BulkJobItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleVersion" ADD CONSTRAINT "ArticleVersion_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleKeyword" ADD CONSTRAINT "ArticleKeyword_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleSource" ADD CONSTRAINT "ArticleSource_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleMedia" ADD CONSTRAINT "ArticleMedia_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalLinkSuggestion" ADD CONSTRAINT "InternalLinkSuggestion_sourceArticleId_fkey" FOREIGN KEY ("sourceArticleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationJob" ADD CONSTRAINT "GenerationJob_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIModel" ADD CONSTRAINT "AIModel_provider_fkey" FOREIGN KEY ("provider") REFERENCES "AIProviderConfig"("provider") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProviderCredential" ADD CONSTRAINT "UserProviderCredential_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIUsage" ADD CONSTRAINT "AIUsage_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIUsage" ADD CONSTRAINT "AIUsage_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditAccount" ADD CONSTRAINT "CreditAccount_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditTransaction" ADD CONSTRAINT "CreditTransaction_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanFeature" ADD CONSTRAINT "PlanFeature_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BulkJob" ADD CONSTRAINT "BulkJob_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BulkJob" ADD CONSTRAINT "BulkJob_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BulkJobItem" ADD CONSTRAINT "BulkJobItem_bulkJobId_fkey" FOREIGN KEY ("bulkJobId") REFERENCES "BulkJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeatureFlagOverride" ADD CONSTRAINT "FeatureFlagOverride_flagId_fkey" FOREIGN KEY ("flagId") REFERENCES "FeatureFlag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeatureFlagOverride" ADD CONSTRAINT "FeatureFlagOverride_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromptVersion" ADD CONSTRAINT "PromptVersion_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "PromptTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
