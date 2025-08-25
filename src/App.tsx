import ScannerTables from "./components/ScannerTables";
import Header from "./components/Header";

function App() {
  return (
    <>
      <Header />
      <main className="max-w-7xl mx-auto">
        <ScannerTables />
      </main>
    </>
  );
}

export default App;
