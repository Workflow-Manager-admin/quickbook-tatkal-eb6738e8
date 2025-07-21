import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import TatkalBookingApp from './tatkal/TatkalBookingApp';
import './tatkal/tatkal.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <TatkalBookingApp />
  </React.StrictMode>
);
