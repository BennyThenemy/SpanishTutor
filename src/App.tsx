import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Home } from './pages/Home'
import { Call } from './pages/Call'
import { ComingSoon } from './pages/ComingSoon'
import { Placement } from './pages/Placement'
import { Vocab } from './pages/Vocab'

export function App() {
  return (
    <BrowserRouter>
      {/* Phone layout everywhere; on desktop it's centered in a phone-width column. */}
      <div className="mx-auto h-full max-w-[430px] overflow-hidden bg-bg sm:border-x sm:border-line">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/placement" element={<Placement />} />
          <Route path="/call" element={<Call />} />
          <Route path="/mistakes" element={<ComingSoon title="Mistakes" />} />
          <Route path="/vocab" element={<Vocab />} />
          <Route path="/library" element={<ComingSoon title="Library" />} />
          <Route path="/settings" element={<ComingSoon title="Settings" />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}
