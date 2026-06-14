import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

import './styles/index.css';
import './styles/common.css';
import './styles/Navbar.css';
import './styles/LoginPage.css';
import './styles/ClientDashboard.css';
import './styles/PlanoCard.css';
import './styles/components.css';
import './pages/pages.css';

// React 18 - ReactDOM.createRoot obrigatório
const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
