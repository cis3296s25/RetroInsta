let url = import.meta.env.VITE_BACKEND_URL;

if (!url) {
    throw new Error("VITE_BACKEND_URL is not defined in the environment variables.");
}

// strip trailing / if present
if (url.endsWith('/')) {
    url = url.slice(0, -1);
}

export const BACKEND_URL = url;