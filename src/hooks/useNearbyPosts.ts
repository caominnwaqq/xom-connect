import { useEffect, useState } from "react";

import type { NearbyPost } from "@/lib/posts";
import { supabase } from "@/lib/supabase/client";
import { useGeolocation } from "@/src/hooks/useGeolocation";

export function useNearbyPosts(radiusMeters: number) {
    const { location, error: locationError, loading: locationLoading } = useGeolocation();
    const [posts, setPosts] = useState<NearbyPost[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [queryLoading, setQueryLoading] = useState(false);

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

            const { data, error: queryError } = await supabase.rpc("get_nearby_posts", {
                user_lat: location.lat,
                user_lng: location.lng,
                radius_meters: radiusMeters,
            });

            if (!active) {
                return;
            }

            if (queryError) {
                setPosts([]);
                setError(queryError.message);
            } else {
                setPosts((data ?? []) as NearbyPost[]);
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
        locationError,
    };
}