import { Link } from 'react-router-dom'

function Header({ title = 'TO DO LIST', showNav = true }) {
  return (
    <header className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md border-b border-slate-200/60 z-40">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo/Title */}
        <Link to="/home" className="flex items-center gap-3 group">
          <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <span className="text-lg font-semibold text-slate-900 group-hover:text-slate-600 transition-colors">
            {title}
          </span>
        </Link>

        
      </div>
    </header>
  )
}

export default Header