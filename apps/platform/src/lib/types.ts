export type PlatformMe = {
  id: string;
  name: string;
  email: string;
  scope: "platform";
  roles: Array<"platform_super_admin" | "platform_support">;
};

export type PlatformTenantListItem = {
  id: string;
  name: string;
  slug: string | null;
  status: "ACTIVE" | "SUSPENDED";
  ownerId: string | null;
  createdAt: string;
  updatedAt: string;
  suspendedAt: string | null;
  lastLoginAt: string | null;
  plan:
    | {
        code: "FREE" | "PRO" | "ENTERPRISE";
        name: string;
        status: "ACTIVE" | "TRIALING" | "PAST_DUE" | "CANCELED";
      }
    | null;
  usage: {
    users: number;
    animals: number;
    products: number;
    batches: number;
  };
};

export type PlatformTenantListResponse = {
  items: PlatformTenantListItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type PlatformPlan = {
  id: string;
  code: "FREE" | "PRO" | "ENTERPRISE";
  name: string;
  description: string | null;
  isActive: boolean;
  limits: Array<{
    id: string;
    metric:
      | "USERS"
      | "ACTIVE_ANIMALS"
      | "PRODUCTS"
      | "ACTIVE_BATCHES"
      | "API_REQUESTS_MONTHLY"
      | "STORAGE_MB";
    metricName: string;
    unit: string;
    softLimit: number | null;
    hardLimit: number | null;
  }>;
};
