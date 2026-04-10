import { Link } from 'react-router-dom'

function Header({ title = 'TO DO LIST', showNav = true }) {
  return (
    <header className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md border-b border-slate-200/60 z-40">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo/Title */}
        <Link to="/home" className="flex items-center gap-3 group">
          <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
            <img src="/logo.svg" alt="EventHub" className="h-8 object-contain" />
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