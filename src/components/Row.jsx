import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { formatTime, formatMoney } from "../utils/formatString";
import { itemStatus } from "../utils/itemStatus";
import { getDoc, doc } from "firebase/firestore";
import { db } from "../firebase/config";
import { editItems } from "../firebase/utils";

const useItemRow = (item) => {
  const [amount, setAmount] = useState(item.startingPrice);
  const [bids, setBids] = useState(0);
  const [winner, setWinner] = useState("");
  const [winnerEmail, setWinnerEmail] = useState("");
  const [winnerPhone, setWinnerPhone] = useState("");
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const status = itemStatus(item);
    setAmount(formatMoney(item.currency, status.amount));
    setBids(status.bids);
    if (status.winner) {
      getDoc(doc(db, "users", status.winner)).then((user) => {
        setWinner(user.get("name") || "");
        setWinnerEmail(user.get("email") || "");
        setWinnerPhone(user.get("phone") || "");
      });
    } else {
      setWinner("");
      setWinnerEmail("");
      setWinnerPhone("");
    }
  }, [item]);

  useEffect(() => {
    let rafId;
    const updateTimer = () => {
      const now = Date.now();
      const remaining = item.endTime - now;
      if (remaining > 0) {
        setTimeLeft(formatTime(remaining));
        rafId = requestAnimationFrame(updateTimer);
      } else {
        setTimeLeft("Item Ended");
      }
    };
    rafId = requestAnimationFrame(updateTimer);
    return () => cancelAnimationFrame(rafId);
  }, [item.endTime]);

  return { amount, bids, winner, winnerEmail, winnerPhone, timeLeft };
};

const itemPropType = PropTypes.shape({
  startingPrice: PropTypes.number.isRequired,
  currency: PropTypes.string.isRequired,
  endTime: PropTypes.object.isRequired,
  id: PropTypes.number.isRequired,
  title: PropTypes.string.isRequired,
});

export const Row = ({ item }) => {
  const { amount, bids, winner, winnerEmail, winnerPhone, timeLeft } = useItemRow(item);

  return (
    <tr>
      <td>{item.id}</td>
      <td>{item.title}</td>
      <td>{amount}</td>
      <td>{bids}</td>
      <td>
        {winner && (
          <>
            <div>{winner}</div>
            {winnerEmail && <small className="text-muted">{winnerEmail}</small>}
            {winnerEmail && winnerPhone && <br />}
            {winnerPhone && <small className="text-muted">{winnerPhone}</small>}
          </>
        )}
      </td>
      <td>{timeLeft}</td>
      <td>
        <button
          className="btn btn-warning me-3"
          onClick={() => editItems(item.id, true, false)}
        >
          Update item
        </button>
        <button
          className="btn btn-danger me-3"
          onClick={() => editItems(item.id, false, true)}
        >
          Delete bids
        </button>
      </td>
    </tr>
  );
};

Row.propTypes = {
  item: itemPropType,
};

export const ItemCard = ({ item }) => {
  const { amount, bids, winner, winnerEmail, winnerPhone, timeLeft } = useItemRow(item);

  return (
    <div className="card mb-3">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-start mb-2 gap-2">
          <div className="flex-grow-1">
            <div className="fw-bold">#{item.id} &middot; {item.title}</div>
            <small className="text-muted">{timeLeft}</small>
          </div>
          <span className="badge bg-secondary text-nowrap">{bids} bid{bids === 1 ? "" : "s"}</span>
        </div>
        <div className="mb-2">
          <span className="text-muted me-2">Price:</span>
          <strong>{amount}</strong>
        </div>
        {winner && (
          <div className="mb-2">
            <div>
              <span className="text-muted me-2">Winner:</span>
              <strong>{winner}</strong>
            </div>
            {winnerEmail && <div><small className="text-muted">{winnerEmail}</small></div>}
            {winnerPhone && <div><small className="text-muted">{winnerPhone}</small></div>}
          </div>
        )}
        <div className="d-flex gap-2">
          <button
            className="btn btn-warning btn-sm flex-grow-1"
            onClick={() => editItems(item.id, true, false)}
          >
            Update item
          </button>
          <button
            className="btn btn-danger btn-sm flex-grow-1"
            onClick={() => editItems(item.id, false, true)}
          >
            Delete bids
          </button>
        </div>
      </div>
    </div>
  );
};

ItemCard.propTypes = {
  item: itemPropType,
};
