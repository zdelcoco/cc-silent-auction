import React from "react";
import Grid from "../components/Grid";
import { ItemModal, DonationModal } from "../components/Modal";

function HomePage() {
  return (
    <div className="container mt-3">
      <Grid />
      <ItemModal />
      <DonationModal />
    </div>
  );
}

export default HomePage;
