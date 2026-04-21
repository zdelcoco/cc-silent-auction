import React, { useState, useEffect, useContext } from "react";
import PropTypes from "prop-types";
import { itemStatus } from "../utils/itemStatus";
import { formatMoney } from "../utils/formatString";
import { ModalsContext } from "../contexts/ModalsContext";
import { ModalTypes } from "../utils/modalTypes";
import { getDoc, doc } from "firebase/firestore";
import { db } from "../firebase/config";

export const Item = ({ item }) => {
  const { openModal } = useContext(ModalsContext);

  const [primaryImageSrc, setPrimaryImageSrc] = useState("");
  const [bids, setBids] = useState(0);
  const [amount, setAmount] = useState(item.startingPrice);
  const [winner, setWinner] = useState("");
  const [preview, setPreview] = useState(
    !!(item.startTime && Date.now() < item.startTime.getTime())
  );
  const [ended, setEnded] = useState(Date.now() >= item.endTime.getTime());

  useEffect(() => {
    const status = itemStatus(item);
    setBids(status.bids);
    setAmount(formatMoney(item.currency, status.amount));
    if (status.winner) {
      getDoc(doc(db, "users", status.winner)).then((user) => {
        setWinner(user.get("name"));
      });
    } else {
      setWinner("");
    }
  }, [item]);

  useEffect(() => {
    const timers = [];
    const now = Date.now();
    if (item.startTime && now < item.startTime.getTime()) {
      setPreview(true);
      timers.push(
        setTimeout(() => setPreview(false), item.startTime.getTime() - now)
      );
    } else {
      setPreview(false);
    }
    if (now < item.endTime.getTime()) {
      setEnded(false);
      timers.push(
        setTimeout(() => setEnded(true), item.endTime.getTime() - now)
      );
    } else {
      setEnded(true);
    }
    return () => timers.forEach(clearTimeout);
  }, [item.endTime, item.startTime]);

  useEffect(() => {
    import(`../assets/${item.primaryImage}.webp`).then((src) => {
      setPrimaryImageSrc(src.default)
    })
  }, [item.primaryImage])

  const isDonation = item.type === "donation";

  const handleClick = () => {
    if (preview) return;
    if (isDonation) {
      if (ended) return;
      openModal(ModalTypes.DONATION, item);
      return;
    }
    openModal(ModalTypes.ITEM, item);
  };

  const imgBlurred = preview || ended;

  return (
    <div className="col">
      <div className={`card h-100${preview || (isDonation && ended) ? " preview" : ""}`} onClick={handleClick}>
        <div className={imgBlurred ? "preview-img-wrap" : ""}>
          <img
            src={primaryImageSrc}
            className={`card-img-top${imgBlurred ? " preview-blur" : ""}`}
            alt={item.title}
            loading="lazy"
          />
        </div>
        <div className="card-body">
          <h5 className="title">{item.title}</h5>
          <h6 className="card-subtitle mb-2 text-body-secondary">{item.subtitle}</h6>
        </div>
        <ul className="list-group list-group-flush">
          {preview ? (
            <li className="list-group-item">
              <strong>
                {isDonation ? "Donations open soon!" : "Check back in when bidding begins!"}
              </strong>
            </li>
          ) : isDonation ? (
            <li className="list-group-item text-center">
              <strong>{ended ? "Donations closed" : "Donate via Venmo"}</strong>
            </li>
          ) : (
            <>
              <li className="list-group-item d-flex justify-content-between align-items-center">
                <strong>{amount}</strong>
                {winner && (
                  <small className="text-muted">
                    {ended ? "Winner" : "Leading"}: {winner}
                  </small>
                )}
              </li>
              <li className="list-group-item">
                {ended ? "Auction ended" : `${bids} bids`}
              </li>
            </>
          )}
        </ul>
      </div>
    </div>
  );
};

Item.propTypes = {
  item: PropTypes.shape({
    startingPrice: PropTypes.number.isRequired,
    currency: PropTypes.string.isRequired,
    endTime: PropTypes.object.isRequired,
    startTime: PropTypes.object,
    primaryImage: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    subtitle: PropTypes.string.isRequired,
    type: PropTypes.string,
  })
}
