🏠 Xom Connect
Connecting neighborhoods through hyper-local, real-time sharing.

Xom Connect is a mobile-first social platform designed to bring neighbors together. Whether you're looking to borrow a ladder, give away extra fruit from your garden, or need urgent SOS assistance, Xom Connect prioritizes what is happening near you over global noise.

## 🌟 Highlights

  * 📍 **Distance-Aware Discovery:** See posts based on your actual proximity (500m to 2km) using PostGIS technology.
  * 🤝 **Neighborhood Utility:** Dedicated categories for Borrow, Giveaway, SOS, and local services.
  * 📱 **Mobile-First Experience:** Optimized for social sharing on the go with a sleek, responsive UI.
  * 🔒 **Privacy Centric:** Built with Supabase Row Level Security (RLS) to ensure your data stays where it belongs.
  * ⚡ **Modern Tech:** Powered by Next.js 16, React 19, and Tailwind CSS 4.

## ℹ️ Overview

Xom Connect solves the "stranger neighbor" problem. By utilizing real-time geolocation, the app creates a digital bulletin board for your specific street or block. It allows residents to interact through comments, map-based discovery, and instant post creation.

Built by a team dedicated to local community building, this software is designed to be a lightweight, high-impact tool for modern neighborhoods.

## 🚀 Usage instructions

Getting started is as simple as opening the feed. You can browse nearby public posts as a guest or create an account to start contributing.

```typescript
// Example: Creating a post with location 
const { data, error } = await supabase.rpc('create_post_with_location', {
  title: 'Extra mangoes!',
  description: 'Pick them up at the gate.',
  post_type: 'giveaway'
});
```

*(Imagine an animated GIF here showing a user toggling the 500m/2km radius and seeing the map update instantly\!)*

## ⬇️ Installation instructions

To get a local development environment running, follow these steps:

1.  **Clone and Install**
    ```bash
    npm install
    ```
2.  **Environment Setup**
    Create a `.env.local` file with your Supabase credentials:
    ```env
    NEXT_PUBLIC_SUPABASE_URL=your-project-url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
    ```
3.  **Database Bootstrap**
    Execute the `supabase/schema.sql` script in your Supabase SQL Editor.
4.  **Launch**
    ```bash
    npm run dev
    ```

## 🛠️ Tech Stack

  * **Frontend:** Next.js 16 (App Router), TypeScript, Tailwind CSS 4, Lucide Icons.
  * **Backend:** Supabase (Auth, Postgres, Storage).
  * **Geospatial:** PostGIS + Leaflet for map rendering.

## 🗺️ Roadmap

We are actively building the future of local connection.

  * [ ] **Short Term:** Real-time chat integration and activity notifications.
  * [ ] **Mid Term:** Neighborhood trust/reputation models.
  * [ ] **Long Term:** Full PWA support for offline neighborhood access.

## 💭 Feedback and Contributions

We love hearing from the community\! If you have ideas for new features or find a bug, please [open an issue](https://github.com/caominnwaqq/xom-connect/issues) or join our [Discussions](https://github.com/caominnwaqq/xom-connect/discussions).
