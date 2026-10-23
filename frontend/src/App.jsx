import { Route, Routes } from 'react-router-dom';
import AppLayout from './layouts/AppLayout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Products from './pages/Products.jsx';
import AIAssistant from './pages/AIAssistant.jsx';
import StoreOperations from './pages/StoreOperations.jsx';
import NotFound from './pages/NotFound.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="products" element={<Products />} />
        <Route path="assistant" element={<AIAssistant />} />
        <Route path="operations" element={<StoreOperations />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
