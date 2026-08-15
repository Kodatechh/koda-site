import { useState } from "react";

import { supabase } from "@/integrations/supabase/client";

type Props = {
  redirectPath?: string;
};

function normalizeRedirectPath(path?: string) {
  if (!path || !path.startsWith("/") || path.startsWith("//")) return "/conta";
  return path;
}

export function GoogleSignInButton({ redirectPath }: Props) {
  const [error, setError] = useState<string | null>(null);

  async function signIn() {
    setError(null);
    const redirectTo = `${window.location.origin}${normalizeRedirectPath(redirectPath)}`;
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (authError) setError(authError.message);
  }

  return (
    <>
      <button
        type="button"
        onClick={signIn}
        className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-black/15 bg-white text-sm font-semibold hover:bg-[#f9f9fb]"
      >
        <span className="grid h-5 w-5 place-items-center rounded-full border border-black/10 text-[11px] font-bold">G</span>
        Continuar com Google
      </button>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </>
  );
}
