import React from 'react'
import { createRoot } from 'react-dom/client';
import App from './components/App';
import "bootstrap/dist/css/bootstrap.min.css"
import "./index.css"
import { QueryClientProvider, QueryClient } from 'react-query';

import Modal from "react-modal"
Modal.setAppElement('#root')

const queryClient = new QueryClient();
const container = document.getElementById('root');
const root = createRoot(container as HTMLElement);
root.render(
    <React.StrictMode>
        <QueryClientProvider client={queryClient}>
            <App />
        </QueryClientProvider>
    </React.StrictMode>
)
