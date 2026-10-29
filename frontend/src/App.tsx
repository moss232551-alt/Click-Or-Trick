import { Navigate, Route, Routes } from 'react-router-dom';
import LegacyHome from './pages/Home';
import LegacyLogin from './pages/Login';
import LegacyCreateAccount from './pages/CreateAccount';
import LegacyLevels from './pages/Levels';
import SyncPlay from './pages/SyncPlay';

const App = () => (
  <Routes>
    <Route path="/" element={<Navigate to="/home" replace />} />
    <Route path="/home" element={<LegacyHome />} />
    <Route path="/login" element={<LegacyLogin />} />
    <Route path="/create-account" element={<LegacyCreateAccount />} />
    <Route path="/levels" element={<LegacyLevels />} />
        <Route path="/sync" element={<SyncPlay />} />
    <Route path="*" element={<Navigate to="/home" replace />} />
  </Routes>
);

export default App;
