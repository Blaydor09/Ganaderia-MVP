import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";

export type Me = {
  id: string;
  name: string;
  email: string;
  roles: string[];
  organization?: {
    id: string;
    name: string;
    slug: string;
  } | null;
};

export const useMe = () => {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => (await api.get<Me>("/auth/me")).data,
    enabled: isAuthenticated(),
    staleTime: 5 * 60 * 1000,
  });
};
