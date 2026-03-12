"use client";

import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";

import {
  type Coordinates,
  formatDistance,
  formatPostType,
  hasMapCoordinates,
  type NearbyPost,
} from "@/lib/posts";

type NearbyPostsMapProps = {
  center: Coordinates;
  posts: NearbyPost[];
};

export default function NearbyPostsMap({ center, posts }: NearbyPostsMapProps) {
  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-border/70 shadow-sm">
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={15}
        scrollWheelZoom={false}
        className="h-[320px] w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <CircleMarker
          center={[center.lat, center.lng]}
          pathOptions={{ color: "#059669", fillColor: "#10b981", fillOpacity: 0.95 }}
          radius={12}
        >
          <Popup>Bạn đang ở đây</Popup>
        </CircleMarker>

        {posts.filter(hasMapCoordinates).map((post) => (
          <CircleMarker
            key={post.id}
            center={[post.latitude as number, post.longitude as number]}
            pathOptions={{ color: "#111827", fillColor: "#1f2937", fillOpacity: 0.82 }}
            radius={9}
          >
            <Popup>
              <div className="space-y-1">
                <p className="font-semibold">{post.title}</p>
                <p>{formatPostType(post.type)}</p>
                <p>Cách bạn {formatDistance(post.distance_meters)}</p>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}