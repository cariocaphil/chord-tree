import './App.css';
import { ProgressionDisplay } from './components/ProgressionDisplay';
import { SuggestionCards } from './components/SuggestionCards';
import { TimelineGraph } from './components/TimelineGraph';

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>Chord Tree - Composition Tool</h1>
      </header>

      <main className="app-main">
        <section className="section top-section">
          <ProgressionDisplay />
        </section>

        <section className="section middle-section">
          <TimelineGraph />
        </section>

        <section className="section bottom-section">
          <SuggestionCards />
        </section>
      </main>
    </div>
  );
}

export default App;
