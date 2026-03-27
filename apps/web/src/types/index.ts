export type WorkspaceRole = "OWNER" | "ADMIN" | "MANAGER" | "MEMBER" | "VIEWER";

export type SubscriptionStatus =
  | "INACTIVE"
  | "ACTIVE"
  | "TRIALING"
  | "PAST_DUE"
  | "CANCELED"
  | "INCOMPLETE";

export type DocumentStatus = "DRAFT" | "IN_REVIEW" | "APPROVED" | "ARCHIVED";

export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";

export type User = {
  id: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
  provider: "LOCAL" | "GOOGLE";
  plan: "FREE" | "PRO" | "TEAM";
  subscriptionStatus: SubscriptionStatus;
  stripeCustomerId: string | null;
};

export type UserPreview = {
  id: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
};

export type AuthResponse = {
  user: User;
  accessToken: string;
  refreshToken: string;
};

export type BlockType =
  | "PARAGRAPH"
  | "HEADING"
  | "TODO"
  | "BULLET"
  | "QUOTE"
  | "IMAGE"
  | "CALLOUT";

export type DocumentBlock = {
  id: string;
  type: BlockType;
  content: string;
  metadata?: Record<string, unknown> | null;
  position?: number;
};

export type Collaborator = {
  id: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
  role: string;
};

export type CommentRecord = {
  id: string;
  blockId?: string | null;
  content: string;
  createdAt: string;
  updatedAt?: string;
  resolvedAt?: string | null;
  author: UserPreview;
};

export type ApprovalRecord = {
  id: string;
  status: ApprovalStatus;
  notes?: string | null;
  reviewNotes?: string | null;
  createdAt: string;
  updatedAt?: string;
  reviewedAt?: string | null;
  requester: UserPreview;
  reviewer?: UserPreview | null;
};

export type VersionRecord = {
  id: string;
  label?: string | null;
  createdAt: string;
  createdBy: UserPreview;
};

export type PublicShareRecord = {
  id: string;
  token: string;
  title?: string | null;
  allowComments: boolean;
  createdAt: string;
};

export type UploadRecord = {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  url: string;
  createdAt: string;
};

export type ActivityRecord = {
  id: string;
  type: string;
  message: string;
  metadata?: Record<string, unknown> | null;
  documentId?: string | null;
  createdAt: string;
  user?: UserPreview | null;
};

export type DocumentRecord = {
  id: string;
  workspaceId?: string;
  workspaceName?: string;
  title: string;
  icon?: string | null;
  coverUrl?: string | null;
  summary?: string | null;
  category?: string | null;
  status?: DocumentStatus;
  ownerId: string;
  lastEditedBy?: UserPreview | null;
  createdAt: string;
  updatedAt: string;
  isOwner: boolean;
  blocks: DocumentBlock[];
  collaborators: Collaborator[];
  comments?: CommentRecord[];
  approvals?: ApprovalRecord[];
  versions?: VersionRecord[];
  publicShares?: PublicShareRecord[];
  uploads?: UploadRecord[];
  activity?: ActivityRecord[];
  commentsCount?: number;
  approvalsCount?: number;
  sharesCount?: number;
  uploadsCount?: number;
};

export type WorkspaceCard = {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  brandColor?: string | null;
  description?: string | null;
  industry?: string | null;
  aiTone?: string | null;
  onboardingCompleted: boolean;
  role: WorkspaceRole;
  counts: {
    documents: number;
    members: number;
    templates: number;
    uploads: number;
  };
  documents: Array<{
    id: string;
    title: string;
    status: DocumentStatus;
    category?: string | null;
    updatedAt: string;
  }>;
};

export type WorkspaceListResponse = {
  defaultWorkspaceId: string | null;
  items: WorkspaceCard[];
};

export type WorkspaceMemberRecord = {
  id: string;
  userId: string;
  role: WorkspaceRole;
  title?: string | null;
  createdAt: string;
  user: UserPreview;
};

export type WorkspaceInviteRecord = {
  id: string;
  email: string;
  role: WorkspaceRole;
  status: string;
  createdAt: string;
  acceptedAt?: string | null;
};

export type TemplateRecord = {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  icon?: string | null;
  isSystem: boolean;
  blocks: DocumentBlock[];
  createdAt: string;
  updatedAt: string;
};

export type WorkspaceOverview = {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  brandColor?: string | null;
  description?: string | null;
  industry?: string | null;
  aiTone?: string | null;
  onboardingCompleted: boolean;
  role: WorkspaceRole;
  counts: {
    documents: number;
    members: number;
    templates: number;
    pendingInvites: number;
    activePublicShares: number;
    pendingApprovals: number;
  };
  documents: Array<{
    id: string;
    title: string;
    summary?: string | null;
    category?: string | null;
    status: DocumentStatus;
    updatedAt: string;
    commentsCount: number;
    approvalsCount: number;
    sharesCount: number;
    uploadsCount: number;
  }>;
  members: WorkspaceMemberRecord[];
  templates: TemplateRecord[];
  invites: WorkspaceInviteRecord[];
  activity: ActivityRecord[];
};

export type BillingSummary = {
  customerId: string | null;
  plan: "FREE" | "PRO" | "TEAM";
  status: SubscriptionStatus;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd: boolean;
  usage: {
    workspaces: number;
    documents: number;
    uploads: number;
  };
  workspaces: Array<{
    id: string;
    name: string;
    role: WorkspaceRole;
  }>;
  plans: Array<{
    id: string;
    name: string;
    price: string;
    description: string;
    highlighted: boolean;
  }>;
};

export type AnalyticsResponse = {
  overview: {
    documents: number;
    members: number;
    uploads: number;
    approvedDocuments: number;
    pendingApprovals: number;
    openComments: number;
    activePublicShares: number;
  };
  statusBreakdown: Array<{
    status: DocumentStatus;
    count: number;
  }>;
  categoryBreakdown: Array<{
    category: string;
    count: number;
  }>;
  topDocuments: Array<{
    id: string;
    title: string;
    status: DocumentStatus;
    category?: string | null;
    updatedAt: string;
    score: number;
  }>;
  memberActivity: Array<WorkspaceMemberRecord & { activityCount: number }>;
  recentActivity: ActivityRecord[];
};

export type PublicDocumentPayload = {
  share: {
    id: string;
    title?: string | null;
    allowComments: boolean;
    createdAt: string;
  };
  document: {
    id: string;
    title: string;
    summary?: string | null;
    category?: string | null;
    status?: DocumentStatus;
    blocks: DocumentBlock[];
    owner: UserPreview;
    workspace: {
      id: string;
      name: string;
      brandColor?: string | null;
      description?: string | null;
    };
    comments: CommentRecord[];
  };
};
