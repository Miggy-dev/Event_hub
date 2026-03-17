import { Outlet } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';

function App() {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="bg-zinc-900 text-zinc-400 py-8 text-center text-sm border-t border-zinc-800">
        <p>© 2026 EventHub. All rights reserved.</p>
      </footer>
    </div>
  )
}

export default App;
