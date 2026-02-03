import React, { useContext } from "react";
import { editItems } from "../firebase/utils";
import { ItemsContext } from "../contexts/ItemsContext";
import { itemStatus } from "../utils/itemStatus";
import { getDoc, doc } from "firebase/firestore";
import { db } from "../firebase/config";
import Table from "../components/Table";

function AdminPage() {
  const { items } = useContext(ItemsContext);

  const exportWinners = async () => {
    const winners = [];

    for (const item of items) {
      const status = itemStatus(item);
      if (status.winner) {
        const userDoc = await getDoc(doc(db, "users", status.winner));
        winners.push({
          itemId: item.id,
          itemTitle: item.title,
          winningBid: `${item.currency}${status.amount}`,
          winnerName: userDoc.get("name") || "Unknown",
          winnerEmail: userDoc.get("email") || "",
          winnerPhone: userDoc.get("phone") || "",
        });
      }
    }

    if (winners.length === 0) {
      alert("No winners to export yet!");
      return;
    }

    // Generate text report
    let report = "CC SILENT AUCTION - WINNERS REPORT\n";
    report += "Generated: " + new Date().toLocaleString() + "\n";
    report += "=".repeat(50) + "\n\n";

    winners.forEach((w) => {
      report += `Item #${w.itemId}: ${w.itemTitle}\n`;
      report += `Winning Bid: ${w.winningBid}\n`;
      report += `Winner: ${w.winnerName}\n`;
      if (w.winnerEmail) report += `Email: ${w.winnerEmail}\n`;
      if (w.winnerPhone) report += `Phone: ${w.winnerPhone}\n`;
      report += "-".repeat(50) + "\n\n";
    });

    report += `Total Items Won: ${winners.length}\n`;

    // Create downloadable file
    const blob = new Blob([report], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `auction-winners-${new Date().toISOString().split("T")[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mt-3">
      <div className="d-flex justify-content-left mb-3">
        <button
          className="btn btn-danger me-3"
          onClick={() => editItems(undefined, true, false)}
        >
          Update all items
        </button>
        <button
          className="btn btn-danger me-3"
          onClick={() => editItems(undefined, false, true)}
        >
          Delete all bids
        </button>
        <button
          className="btn btn-success me-3"
          onClick={exportWinners}
        >
          Export Winners
        </button>
      </div>
      <Table />
    </div>
  );
}

export default AdminPage;
