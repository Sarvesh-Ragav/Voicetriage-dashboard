import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import { Home, Map, Users, Brain, FileText, Bell } from 'lucide-react'
import { useCases } from './hooks/useCases'
import { useState } from 'react'

import CommandHome from './pages/CommandHome'
import DistrictMap from './pages/DistrictMap'
import ASHAWorkforce from './pages/ASHAWorkforce'
import ClinicalIntelligence from './pages/ClinicalIntelligence'
import ReportsSupply from './pages/ReportsSupply'
import AlertSidebar from './components/AlertSidebar'

const navItems = [
  { to: '/', icon: Home, label: 'Command' },
  { to: '/map', icon: Map, label: 'District Map' },
  { to: '/workforce', icon: Users, label: 'Workforce' },
  { to: '/intelligence', icon: Brain, label: 'Intelligence' },
  { to: '/reports', icon: FileText, label: 'Reports' },
]

export default function App() {
  const casesData = useCases()
  const [alertOpen, setAlertOpen] = useState(true)
  const criticalCount = casesData.criticalCases.length

  return (
    <BrowserRouter>
      <div className="flex h-screen bg-[#0F1117] overflow-hidden">

        <aside className="w-16 bg-surface border-r border-border flex flex-col items-center py-4 gap-2 flex-shrink-0">
          <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center mb-4">
            <span className="text-white font-bold text-lg">+</span>
          </div>
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              title={label}
              className={({ isActive }) =>
                `w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${isActive ? 'bg-primary text-white' : 'text-textSecondary hover:bg-surfaceLight hover:text-textPrimary'
                }`
              }
            >
              <Icon size={18} />
            </NavLink>
          ))}
          <div className="mt-auto relative">
            <button
              onClick={() => setAlertOpen(!alertOpen)}
              className="w-10 h-10 rounded-lg flex items-center justify-center text-textSecondary hover:bg-surfaceLight hover:text-textPrimary transition-colors relative"
              title="Alerts"
            >
              <Bell size={18} />
              {criticalCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-critical rounded-full text-white text-xs flex items-center justify-center font-bold">
                  {criticalCount > 9 ? '9+' : criticalCount}
                </span>
              )}
            </button>
          </div>
        </aside>

        <main className="flex-1 overflow-hidden flex">
          <div className="flex-1 overflow-auto">
            <Routes>
              <Route path="/" element={<CommandHome {...casesData} />} />
              <Route path="/map" element={<DistrictMap {...casesData} />} />
              <Route path="/workforce" element={<ASHAWorkforce {...casesData} />} />
              <Route path="/intelligence" element={<ClinicalIntelligence {...casesData} />} />
              <Route path="/reports" element={<ReportsSupply {...casesData} />} />
            </Routes>
          </div>
          {alertOpen && (
            <AlertSidebar
              criticalCases={casesData.criticalCases}
              onClose={() => setAlertOpen(false)}
            />
          )}
        </main>

      </div>
    </BrowserRouter>
  )
}
