import { queryClient } from "./queryClient";

/* Cancel in-flight fetches and drop all cached server state (e.g. on logout/login). */
export async function resetQueryCache() {
  await queryClient.cancelQueries();
  queryClient.clear();
}
