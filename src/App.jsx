import React, { useContext, useEffect } from "react";
import PropTypes from "prop-types";
import "./App.css";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import { AutoSignIn } from "./firebase/AutoSignIn";
import { ItemsProvider } from "./contexts/ItemsProvider";
import { ModalsProvider } from "./contexts/ModalsProvider";
import { ModalsContext } from "./contexts/ModalsContext";
import { ModalTypes } from "./utils/modalTypes";
import Navbar from "./components/Navbar";
import { SignUpModal, WelcomeModal } from "./components/Modal";
import HomePage from "./pages/Home";
import AdminPage from "./pages/Admin";
import Footer from "./components/Footer";

const WELCOME_SEEN_KEY = "cc-auction-welcome-seen";

const FirstVisitWelcome = () => {
  const { openModal } = useContext(ModalsContext);

  useEffect(() => {
    if (localStorage.getItem(WELCOME_SEEN_KEY)) return;
    localStorage.setItem(WELCOME_SEEN_KEY, "1");
    openModal(ModalTypes.WELCOME);
  }, [openModal]);

  return null;
};

function App() {
  const demo = false;

  const { admin } = AutoSignIn();

  const Providers = ({ children }) => {
    return (
      <ItemsProvider demo={demo}>
        <ModalsProvider>{children}</ModalsProvider>
      </ItemsProvider>
    );
  };

  function ProtectedRoute({ children, condition }) {
    return condition ? children : <Navigate to={import.meta.env.BASE_URL} />;
  }

  return (
    <Providers>
      <Router>
        <Navbar admin={admin} />
        <SignUpModal />
        <WelcomeModal />
        <FirstVisitWelcome />
        <Routes>
          <Route path={import.meta.env.BASE_URL} Component={HomePage} />
          <Route
            exact
            path={import.meta.env.BASE_URL + "admin"}
            element={
              <ProtectedRoute condition={admin}>
                <AdminPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
      <Footer />
    </Providers>
  );
}

App.propTypes = {
  children: PropTypes.arrayOf(PropTypes.element),
  condition: PropTypes.bool
}

export default App;
