import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { UiProvider } from './context/UiContext';
import { Toast } from './ui/Toast/Toast';
import { RequireAuth } from './routes/RequireAuth';
import { AppLayout } from './layouts/AppLayout';
import { ElderLayout } from './layouts/ElderLayout';
import { WelcomePage } from './pages/WelcomePage';
import { SignInPage } from './pages/SignInPage';
import { FamilyHomePage } from './pages/FamilyHomePage';
import { ElderFormPage } from './pages/ElderFormPage';
import { ElderPage } from './pages/elder/ElderPage';
import { TopicsPage } from './pages/interview/TopicsPage';
import { ConsentPage } from './pages/interview/ConsentPage';
import { InterviewPage } from './pages/interview/InterviewPage';
import { SessionDonePage } from './pages/interview/SessionDonePage';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/welcome" element={<WelcomePage />} />
      <Route path="/signin" element={<SignInPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<FamilyHomePage />} />
          <Route path="/elders/new" element={<ElderFormPage />} />
          <Route path="/elders/:id/edit" element={<ElderFormPage />} />
          <Route path="/elders/:id" element={<Navigate to="interviews" replace />} />
          <Route path="/elders/:id/:section" element={<ElderPage />} />
        </Route>
        <Route element={<ElderLayout />}>
          <Route path="/elders/:id/topics" element={<TopicsPage />} />
          <Route path="/elders/:id/consent" element={<ConsentPage />} />
          <Route path="/interview/:sessionId" element={<InterviewPage />} />
          <Route path="/interview/:sessionId/done" element={<SessionDonePage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <UiProvider>
        <AppRoutes />
        <Toast />
      </UiProvider>
    </AuthProvider>
  );
}
