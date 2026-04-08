

export const serverURL = (import.meta.env.VITE_SERVER_URL.toString().includes("localhost") ? "http://" : "https://") +
    import.meta.env.VITE_SERVER_URL;

export const socketURL = (import.meta.env.VITE_SERVER_URL.toString().includes("localhost") ? "ws://" : "wss://") +
    import.meta.env.VITE_SERVER_URL;

export const pbURL = import.meta.env.VITE_PB_URL.toString();
