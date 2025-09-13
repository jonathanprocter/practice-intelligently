import { useQuery } from "@tanstack/react-query";
import { ApiClient } from "@/lib/api";

export function useUrgentActionItems() {
  const query = useQuery({
    queryKey: ['urgent-action-items'],
    queryFn: ApiClient.getUrgentActionItems,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes (increased from 2)
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchInterval: 2 * 60 * 1000, // Refetch every 2 minutes (reduced frequency)
    refetchOnWindowFocus: false, // Disable refetch on window focus to reduce calls
  });

  return {
    actionItems: query.data,
    count: query.data?.length || 0,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}