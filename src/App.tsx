import { TopBar } from './components/TopBar';
import { ActivityHistory } from './views/ActivityHistory';
import { AgentAnalysis } from './views/AgentAnalysis';
import { ApprovalFlow } from './views/ApprovalFlow';
import { SettingsAbout } from './views/SettingsAbout';
import { TransactionInspection } from './views/TransactionInspection';
import { TreasuryOverview } from './views/TreasuryOverview';
import { AppProvider } from './state/AppProvider';
import { useRoute } from './state/router';

function Screens(): React.JSX.Element {
  const { route, navigate } = useRoute();

  return (
    <div className="app">
      <TopBar route={route} />
      <main className="app__body" id="main">
        {route.name === 'overview' ? <TreasuryOverview navigate={navigate} /> : null}
        {route.name === 'event' ? <TransactionInspection eventId={route.id} navigate={navigate} /> : null}
        {route.name === 'analysis' ? <AgentAnalysis eventId={route.id} navigate={navigate} /> : null}
        {route.name === 'approve' ? <ApprovalFlow eventId={route.id} navigate={navigate} /> : null}
        {route.name === 'history' ? <ActivityHistory navigate={navigate} /> : null}
        {route.name === 'settings' ? <SettingsAbout /> : null}
      </main>
      <footer className="footer">
        Arbitrum Sepolia testnet prototype · deterministic policy in code, AI explanation only · not
        financial advice
      </footer>
    </div>
  );
}

export function App(): React.JSX.Element {
  return (
    <AppProvider>
      <Screens />
    </AppProvider>
  );
}
