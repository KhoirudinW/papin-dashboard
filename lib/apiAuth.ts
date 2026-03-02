import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export type ApiAuthUser = {
  id: string;
  email: string;
};

export const getBearerToken = (request: Request) => {
  const authHeader = request.headers.get("authorization") || "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return "";
  }

  return authHeader.slice(7).trim();
};

export const getApiAuthUser = async (request: Request): Promise<ApiAuthUser | null> => {
  const token = getBearerToken(request);
  if (!token) {
    return null;
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user?.id || !data.user.email) {
    return null;
  }

  return {
    id: data.user.id,
    email: data.user.email.toLowerCase(),
  };
};
