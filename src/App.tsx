import './App.css';
import LiquidGlass from './LiquidGlass';

function App() {
  return (
    <div className="app">
      {/* Background image */}
      <div className="background">
        <div className="gradient-bg"></div>
        <div className="pattern-overlay"></div>
      </div>

      {/* Main content */}
      <div className="content">
        <header className="header">
          <h1>Liquid Glass Effect</h1>
          <p>Experience the magical liquid glass effect with drag and drop interaction</p>
        </header>

        <main className="main">
          {/* Demo introduction */}
          <div className="demo-intro">
            <h2>Drag the glass sphere below to observe the background distortion effect</h2>
          </div>

          {/* Demo content area */}
          <div className="demo-content">
            <div className="demo-grid">
              <div className="demo-card">
                <div className="card-icon"></div>
                <h3>Magnifying Effect</h3>
                <p>Content viewed through the glass sphere creates a magnifying lens distortion effect, simulating real optical phenomena.</p>
              </div>
              
              <div className="demo-card">
                <div className="card-icon"></div>
                <h3>Real-time Rendering</h3>
                <p>Based on SVG filters and Canvas technology, real-time calculation of pixel displacement creates smooth visual experience.</p>
              </div>
              
              <div className="demo-card">
                <div className="card-icon"></div>
                <h3>React Component</h3>
                <p>Fully componentized design with custom shader support, easily integrated into any React project.</p>
              </div>
            </div>
          </div>

          {/* Technical description */}
          <div className="tech-section">
            <h2>Core Technology</h2>
            <div className="tech-grid">
              <div className="tech-item">
                <strong>SVG Filters</strong>
                <span>feDisplacementMap for pixel displacement</span>
              </div>
              <div className="tech-item">
                <strong>Canvas Rendering</strong>
                <span>Real-time displacement map generation</span>
              </div>
              <div className="tech-item">
                <strong>Mathematical Algorithms</strong>
                <span>SDF and smooth interpolation functions</span>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Liquid Glass component - adjust initial position */}
      <LiquidGlass 
        width={280} 
        height={180}
        style={{
          top: '40%',
          left: '50%',
          transform: 'translate(-50%, -50%)'
        }}
      />
    </div>
  );
}

export default App;
