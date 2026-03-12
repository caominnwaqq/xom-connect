import { useState, useEffect } from 'react';

interface Location {
    lat: number;
    lng: number;
}

export function useGeolocation() {
    const [location, setLocation] = useState<Location | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!navigator.geolocation) {
            const timeoutId = window.setTimeout(() => {
                setError('Trình duyệt của bạn không hỗ trợ định vị GPS.');
                setLoading(false);
            }, 0);

            return () => window.clearTimeout(timeoutId);
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLocation({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                });
                setLoading(false);
            },
            (err) => {
                setError(err.message);
                // Fallback: Tọa độ trung tâm Ninh Kiều, Cần Thơ để test khi Dev
                setLocation({ lat: 10.03, lng: 105.77 });
                setLoading(false);
            },
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
    }, []);

    return { location, error, loading };
}