import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Landing from './components/Landing';
import GroupMap from './components/GroupMap';
import './index.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/group/:groupId" element={<GroupMap />} />
      </Routes>
    </Router>
  );
}

export default App;
