import ScannerTables from "./components/ScannerTables";
import Header from "./components/Header";

function App() {
  return (
    <div className="h-screen overflow-hidden flex flex-col">
      <Header />
      <main className="w-full p-4 flex grow-1">
        <ScannerTables />
      </main>
    </div>
  );
}

export default App;
