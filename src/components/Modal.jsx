import React, { useState, useEffect, useContext } from "react";
import PropTypes from "prop-types";
import ReactDOM from "react-dom";
import { itemStatus } from "../utils/itemStatus";
import { formatField, formatMoney } from "../utils/formatString";
import { updateProfile } from "firebase/auth";
import { doc, setDoc, updateDoc, getDoc, Timestamp } from "firebase/firestore";
import { auth, db } from "../firebase/config";
import { ModalsContext } from "../contexts/ModalsContext";
import { ModalTypes } from "../utils/modalTypes";

const Modal = ({ type, title, children }) => {
  const { closeModal, currentModal } = useContext(ModalsContext);

  if (type !== currentModal) return null;

  return ReactDOM.createPortal(
    <div
      className="modal fade show"
      style={{ display: "block" }}
      onClick={closeModal}
    >
      <div
        className="modal-dialog modal-dialog-centered modal-dialog-scrollable"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{title}</h5>
            <button className="btn-close" onClick={closeModal} />
          </div>
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};

Modal.propTypes = {
  type: PropTypes.string,
  title: PropTypes.string,
  children: PropTypes.arrayOf(PropTypes.element)
}

const ItemModal = () => {
  const { activeItem, openModal, closeModal } = useContext(ModalsContext);
  const [secondaryImageSrc, setSecondaryImageSrc] = useState("");
  const [bid, setBid] = useState("");
  const [valid, setValid] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [lastBidder, setLastBidder] = useState("");
  const [pendingAction, setPendingAction] = useState(null);
  const [, setTick] = useState(0);

  const minIncrease = activeItem.minimumIncrease || 1;
  const maxIncrease = activeItem.maximumIncrease || 10;

  const status = activeItem.endTime
    ? itemStatus(activeItem)
    : { amount: 0, bids: 0, winner: "" };
  const currentAmount = status.amount;
  const now = Date.now();
  const isPreview = !!(activeItem.startTime && now < activeItem.startTime.getTime());
  const isEnded = !!(activeItem.endTime && now >= activeItem.endTime.getTime());

  useEffect(() => {
    if (!activeItem.endTime) return;
    const timers = [];
    const nowMs = Date.now();
    const startMs = activeItem.startTime ? activeItem.startTime.getTime() : null;
    const endMs = activeItem.endTime.getTime();
    if (startMs && nowMs < startMs) {
      timers.push(setTimeout(() => setTick((t) => t + 1), startMs - nowMs));
    }
    if (nowMs < endMs) {
      timers.push(setTimeout(() => setTick((t) => t + 1), endMs - nowMs));
    }
    return () => timers.forEach(clearTimeout);
  }, [activeItem.endTime, activeItem.startTime]);

  useEffect(() => {
    setSecondaryImageSrc("");
    if (activeItem.secondaryImage === undefined) return;
    let cancelled = false;
    import(`../assets/${activeItem.secondaryImage}.webp`).then((src) => {
      if (!cancelled) setSecondaryImageSrc(src.default);
    });
    return () => {
      cancelled = true;
    };
  }, [activeItem.secondaryImage]);

  useEffect(() => {
    setIsSubmitting(false);
    setFeedback("");
    setValid("");
    setBid("");
    setPendingAction(null);
    const winnerUid = activeItem.endTime ? itemStatus(activeItem).winner : "";
    if (winnerUid) {
      let cancelled = false;
      getDoc(doc(db, "users", winnerUid)).then((user) => {
        if (!cancelled) setLastBidder(user.get("name"));
      });
      return () => {
        cancelled = true;
      };
    }
    setLastBidder("");
  }, [activeItem]);

  const minBidAmount = currentAmount + minIncrease;
  const maxBidAmount = currentAmount + maxIncrease;

  const delayedClose = () => {
    setTimeout(() => {
      closeModal();
      setFeedback("");
      setValid("");
      setBid("");
    }, 1000);
  };

  const executeBid = (amount) => {
    const nowTime = new Date().getTime();
    if (activeItem.endTime - nowTime < 0) {
      setFeedback("Sorry, this item has ended!");
      setValid("is-invalid");
      delayedClose();
      setIsSubmitting(false);
      return;
    }
    const status = itemStatus(activeItem);
    const currentMin = status.amount + minIncrease;
    const currentMax = status.amount + maxIncrease;
    if (amount < currentMin) {
      setFeedback(`Minimum bid is ${formatMoney(activeItem.currency, currentMin)}`);
      setValid("is-invalid");
      setIsSubmitting(false);
      return;
    }
    if (amount > currentMax) {
      setFeedback(`Maximum bid is ${formatMoney(activeItem.currency, currentMax)}`);
      setValid("is-invalid");
      setIsSubmitting(false);
      return;
    }
    updateDoc(doc(db, "auction", "items"), {
      [formatField(activeItem.id, status.bids + 1)]: {
        amount,
        uid: auth.currentUser.uid,
      },
    });
    console.debug("submitBid() write to auction/items");
    setValid("is-valid");
    delayedClose();
  };

  const executeBuyItNow = () => {
    const nowTime = new Date().getTime();
    if (activeItem.endTime - nowTime < 0) {
      setFeedback("Sorry, this item has ended!");
      setValid("is-invalid");
      delayedClose();
      setIsSubmitting(false);
      return;
    }
    const price = activeItem.buyItNow;
    const status = itemStatus(activeItem);
    if (status.amount >= price) {
      setFeedback("Current bid has already exceeded the buy-it-now price.");
      setValid("is-invalid");
      setIsSubmitting(false);
      return;
    }
    updateDoc(doc(db, "auction", "items"), {
      [formatField(activeItem.id, status.bids + 1)]: {
        amount: price,
        uid: auth.currentUser.uid,
      },
      [`${formatField(activeItem.id, 0)}.endTime`]: Timestamp.now(),
    });
    console.debug("handleBuyItNow() write to auction/items");
    setValid("is-valid");
    delayedClose();
  };

  const submitBid = (amount) => {
    const nowTime = new Date().getTime();
    setIsSubmitting(true);
    if (activeItem.endTime - nowTime < 0) {
      setFeedback("Sorry, this item has ended!");
      setValid("is-invalid");
      delayedClose();
      setIsSubmitting(false);
      return;
    }
    if (auth.currentUser.displayName == null) {
      setFeedback("You must provide a username before bidding!");
      setValid("is-invalid");
      setTimeout(() => {
        openModal(ModalTypes.SIGN_UP);
        setIsSubmitting(false);
        setValid("");
      }, 1000)
      return;
    }
    const status = itemStatus(activeItem);
    const currentMin = status.amount + minIncrease;
    const currentMax = status.amount + maxIncrease;
    if (amount < currentMin) {
      setFeedback(`Minimum bid is ${formatMoney(activeItem.currency, currentMin)}`);
      setValid("is-invalid");
      setIsSubmitting(false);
      return;
    }
    if (amount > currentMax) {
      setFeedback(`Maximum bid is ${formatMoney(activeItem.currency, currentMax)}`);
      setValid("is-invalid");
      setIsSubmitting(false);
      return;
    }
    const increase = amount - status.amount;
    if (increase % minIncrease !== 0) {
      setFeedback(`Bid must be in increments of ${formatMoney(activeItem.currency, minIncrease)}`);
      setValid("is-invalid");
      setIsSubmitting(false);
      return;
    }
    setPendingAction({ type: "bid", amount });
  };

  const handleBuyItNow = () => {
    const nowTime = new Date().getTime();
    setIsSubmitting(true);
    if (activeItem.endTime - nowTime < 0) {
      setFeedback("Sorry, this item has ended!");
      setValid("is-invalid");
      delayedClose();
      setIsSubmitting(false);
      return;
    }
    if (auth.currentUser.displayName == null) {
      setFeedback("You must provide a username before bidding!");
      setValid("is-invalid");
      setTimeout(() => {
        openModal(ModalTypes.SIGN_UP);
        setIsSubmitting(false);
        setValid("");
      }, 1000);
      return;
    }
    setPendingAction({ type: "buyNow", amount: activeItem.buyItNow });
  };

  const handleConfirmAction = () => {
    if (!pendingAction) return;
    const action = pendingAction;
    setPendingAction(null);
    if (action.type === "buyNow") {
      executeBuyItNow();
    } else {
      executeBid(action.amount);
    }
  };

  const handleCancelAction = () => {
    setPendingAction(null);
    setIsSubmitting(false);
  };

  const handleSubmitBid = () => {
    // Ensure input is a monetary value
    if (!/^\d+(\.\d{1,2})?$/.test(bid)) {
      setFeedback("Please enter a valid monetary amount!");
      setValid("is-invalid");
      setIsSubmitting(false);
      return;
    }
    submitBid(parseFloat(bid));
  };

  const handleQuickBid = (amount) => {
    setBid(amount.toString());
    submitBid(amount);
  };

  const handleChange = (e) => {
    setBid(e.target.value);
    setIsSubmitting(false);
    setValid("");
    setFeedback("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !isSubmitting) {
      handleSubmitBid();
    }
  };

  return (
    <Modal type={ModalTypes.ITEM} title={activeItem.title}>
      <div className="modal-body">
        <img src={secondaryImageSrc} className="img-fluid" alt={activeItem.title} />
        <p className="mt-3">{activeItem.detail}</p>
      </div>
      <div className="modal-footer flex-column align-items-stretch">
        {pendingAction ? (
          <div className="text-center py-2">
            <p className="mb-3">
              {pendingAction.type === "buyNow" ? (
                <>
                  Buy <strong>{activeItem.title}</strong> now for{" "}
                  <strong>{formatMoney(activeItem.currency, pendingAction.amount)}</strong>?
                  <br />
                  <small className="text-muted">This will end the auction immediately.</small>
                </>
              ) : (
                <>
                  Place a bid of{" "}
                  <strong>{formatMoney(activeItem.currency, pendingAction.amount)}</strong> on{" "}
                  <strong>{activeItem.title}</strong>?
                </>
              )}
            </p>
            <div className="d-flex gap-2">
              <button
                type="button"
                className="btn btn-outline-secondary flex-grow-1"
                onClick={handleCancelAction}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`btn flex-grow-1 ${pendingAction.type === "buyNow" ? "btn-success" : "btn-primary"}`}
                onClick={handleConfirmAction}
                autoFocus
              >
                Confirm
              </button>
            </div>
          </div>
        ) : isPreview ? (
          <div className="text-center py-3">
            <p className="mb-2"><strong>Preview</strong></p>
            <p className="mb-0">Bidding opens <strong>{activeItem.startTime.toLocaleString()}</strong></p>
          </div>
        ) : isEnded ? (
          <div className="text-center py-3">
            <p className="mb-2"><strong>Bidding closed!</strong></p>
            {lastBidder ? (
              <p className="mb-0">Congratulations to <strong>{lastBidder}</strong> with the winning bid of <strong>{formatMoney(activeItem.currency, currentAmount)}</strong>!</p>
            ) : (
              <p className="mb-0">No bids were placed on this item.</p>
            )}
          </div>
        ) : (
          <>
            <div className="d-flex justify-content-between align-items-center mb-2">
              {lastBidder ? (
                <p className="mb-0"><strong>{lastBidder}</strong> last bid <strong>{formatMoney(activeItem.currency, currentAmount)}</strong></p>
              ) : (
                <p className="mb-0">Starting price: <strong>{formatMoney(activeItem.currency, currentAmount)}</strong></p>
              )}
              <small className="text-muted">Bid in {formatMoney(activeItem.currency, minIncrease)} increments</small>
            </div>
            <div className="d-flex gap-2 mb-3">
              <button
                type="button"
                className="btn btn-outline-primary flex-grow-1"
                onClick={() => handleQuickBid(minBidAmount)}
                disabled={isSubmitting}
              >
                Min Bid - {formatMoney(activeItem.currency, minBidAmount)}
              </button>
              <button
                type="button"
                className="btn btn-outline-primary flex-grow-1"
                onClick={() => handleQuickBid(maxBidAmount)}
                disabled={isSubmitting}
              >
                Max Bid - {formatMoney(activeItem.currency, maxBidAmount)}
              </button>
            </div>
            {activeItem.buyItNow && currentAmount < activeItem.buyItNow && (
              <button
                type="button"
                className="btn btn-success w-100 mb-3"
                onClick={handleBuyItNow}
                disabled={isSubmitting}
              >
                Buy It Now - {formatMoney(activeItem.currency, activeItem.buyItNow)}
              </button>
            )}
            <div className="input-group mb-2">
              <span className="input-group-text">{activeItem.currency}</span>
              <input
                className={`form-control ${valid}`}
                value={bid}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                placeholder="Or enter custom amount"
              />
              <button
                type="submit"
                className="btn btn-primary"
                onClick={handleSubmitBid}
                disabled={isSubmitting}
              >
                Bid
              </button>
              <div className="invalid-feedback">{feedback}</div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

const SignUpModal = () => {
  const { closeModal, setSignedInUser } = useContext(ModalsContext);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [valid, setValid] = useState("");
  const [error, setError] = useState("");

  const handleSignUp = async () => {
    // Validate required fields
    if (!fullName.trim()) {
      setError("Please enter your full name");
      return;
    }
    if (!email.trim() && !phone.trim()) {
      setError("Please enter at least an email or phone number");
      return;
    }

    const user = auth.currentUser;
    await updateProfile(user, { displayName: fullName });
    setDoc(doc(db, "users", user.uid), {
      name: fullName,
      email: email.trim(),
      phone: phone.trim(),
      admin: ""
    });
    console.debug(`signUp() write to users/${user.uid}`);
    setSignedInUser(fullName);
    setValid("is-valid");
    setError("");
    setTimeout(() => {
      closeModal();
      setValid("");
    }, 1000);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSignUp();
    }
  };

  return (
    <Modal type={ModalTypes.SIGN_UP} title="Sign up for CC Silent Auction">
      <div className="modal-body">
        <p>
          Please enter your contact information so we can reach you if you win!
        </p>
        <form onSubmit={(e) => e.preventDefault()}>
          <div className="form-floating mb-3">
            <input
              autoFocus
              id="name-input"
              type="text"
              className={`form-control ${valid}`}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Full Name"
            />
            <label>Full Name *</label>
          </div>
          <div className="form-floating mb-3">
            <input
              id="email-input"
              type="email"
              className={`form-control ${valid}`}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Email"
            />
            <label>Email</label>
          </div>
          <div className="form-floating mb-3">
            <input
              id="phone-input"
              type="tel"
              className={`form-control ${valid}`}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Phone"
            />
            <label>Phone</label>
          </div>
          <small className="text-muted">* Required. Please provide at least an email or phone number.</small>
          {error && <div className="text-danger mt-2">{error}</div>}
        </form>
      </div>
      <div className="modal-footer">
        <button type="button" className="btn btn-secondary" onClick={closeModal}>
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          onClick={handleSignUp}
        >
          Sign up
        </button>
      </div>
    </Modal>
  );
};

export { ItemModal, SignUpModal };
