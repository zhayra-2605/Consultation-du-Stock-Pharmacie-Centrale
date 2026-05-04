import React, { useState } from 'react';
import Dashboard from './pages/Dashboard';
import Login from './components/Login';

const App = () => {
  const [token, setToken] = useState(sessionStorage.getItem('token'));

  if (!token) {
    return <Login setToken={setToken} />;
  }

  return (
    <div className="app-root">
      <Dashboard setToken={setToken} />
    </div>
  );
};

export default App;
