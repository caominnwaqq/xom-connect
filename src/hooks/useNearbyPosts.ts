import { useEffect, useState } from "react";

import type { NearbyPost } from "@/lib/posts";
import { getCellId } from "@/lib/geo/cell";
import { supabaseConfig } from "@/lib/supabase/config";
import { supabase } from "@/lib/supabase/client";
import { useGeolocation } from "@/src/hooks/useGeolocation";

export function useNearbyPosts(radiusMeters: number) {
    const { location, error: locationError, loading: locationLoading } = useGeolocation();
    const [posts, setPosts] = useState<NearbyPost[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [queryLoading, setQueryLoading] = useState(false);
    const cellId = location ? getCellId(location.lat, location.lng) : null;

    useEffect(() => {
        let active = true;

        if (!location) {
            if (!locationLoading) {
                void Promise.resolve().then(() => {
                    if (!active) {
                        return;
                    }

                    setPosts([]);
                    setError(null);
                    setQueryLoading(false);
                });
            }

            return () => {
                active = false;
            };
        }

        const fetchPosts = async () => {
            await Promise.resolve();

            if (!active) {
                return;
            }

            setQueryLoading(true);

            const headers = new Headers();
            if (supabase) {
                const { data } = await supabase.auth.getSession();
                const token = data.session?.access_token;
                if (token) headers.set("authorization", `Bearer ${token}`);
            }

            const url = headers.has("authorization")
                ? `/api/feed/nearby?radius=${encodeURIComponent(radiusMeters)}&limit=50`
                : `/api/feed/public/nearby?cell=${encodeURIComponent(getCellId(location.lat, location.lng))}&radius=${encodeURIComponent(
                    radiusMeters
                )}&limit=50`;

            const response = await fetch(url, { method: "GET", headers });
            const payload = (await response.json().catch(() => null)) as
                | { error: string }
                | { data: NearbyPost[] }
                | null;

            if (!active) {
                return;
            }

            if (!response.ok || !payload || "error" in payload) {
                setPosts([]);
                setError(
                    payload && "error" in payload
                        ? payload.error
                        : supabaseConfig.errorMessage ?? "Không thể tải nearby feed."
                );
            } else {
                setPosts((payload.data ?? []) as NearbyPost[]);
                setError(null);
            }

            setQueryLoading(false);
        };

        void fetchPosts();

        return () => {
            active = false;
        };
    }, [location, locationLoading, radiusMeters]);

    return {
        posts,
        error,
        loading: locationLoading || queryLoading,
        location,
        cellId,
        locationError,
    };
}