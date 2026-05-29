// Dynamically resolve API URL based on current browser hostname
// This allows the app to work from both localhost and LAN devices (e.g. phone)
export const API_URL =
  import.meta.env.VITE_API_URL || `http://${window.location.hostname}:3000`;
