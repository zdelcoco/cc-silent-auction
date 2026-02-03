import React, { useState, useEffect, useContext } from "react";
import PropTypes from "prop-types";
import ReactDOM from "react-dom";
import { itemStatus } from "../utils/itemStatus";
import { formatField, formatMoney } from "../utils/formatString";
import { updateProfile } from "firebase/auth";
import { doc, setDoc, updateDoc, getDoc } from "firebase/firestore";
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
  const [currentAmount, setCurrentAmount] = useState(0);
  const [lastBidder, setLastBidder] = useState("");
  const [numBids, setNumBids] = useState(0);
  const [isEnded, setIsEnded] = useState(false);

  const minIncrease = activeItem.minimumIncrease || 1;
  const maxIncrease = activeItem.maximumIncrease || 10;

  useEffect(() => {
    if (!activeItem.endTime) return;
    const checkEnded = () => {
      const now = Date.now();
      const remaining = activeItem.endTime - now;
      if (remaining <= 0) {
        setIsEnded(true);
      } else {
        setIsEnded(false);
        requestAnimationFrame(checkEnded);
      }
    };
    checkEnded();
  }, [activeItem.endTime]);

  useEffect(() => {
    if (activeItem.secondaryImage === undefined) return;
    import(`../assets/${activeItem.secondaryImage}.jpg`).then((src) => {
      setSecondaryImageSrc(src.default)
    })
  }, [activeItem.secondaryImage])

  useEffect(() => {
    const status = itemStatus(activeItem);
    setCurrentAmount(status.amount);
    setNumBids(status.bids);
    if (status.winner) {
      getDoc(doc(db, "users", status.winner)).then((user) => {
        setLastBidder(user.get("name"));
      });
    } else {
      setLastBidder("");
    }
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

  const submitBid = (amount) => {
    // Get bid submission time as early as possible
    let nowTime = new Date().getTime();
    // Disable bid submission while we submit the current request
    setIsSubmitting(true);
    // Ensure item has not already ended
    if (activeItem.endTime - nowTime < 0) {
      setFeedback("Sorry, this item has ended!");
      setValid("is-invalid");
      delayedClose();
      setIsSubmitting(false);
      return;
    }
    // Ensure user has provided a username
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
    // Get current status for validation
    const status = itemStatus(activeItem);
    const currentMin = status.amount + minIncrease;
    const currentMax = status.amount + maxIncrease;
    // Ensure input is large enough
    if (amount < currentMin) {
      setFeedback(`Minimum bid is ${formatMoney(activeItem.currency, currentMin)}`);
      setValid("is-invalid");
      setIsSubmitting(false);
      return;
    }
    // Ensure input is small enough
    if (amount > currentMax) {
      setFeedback(`Maximum bid is ${formatMoney(activeItem.currency, currentMax)}`);
      setValid("is-invalid");
      setIsSubmitting(false);
      return;
    }
    // Ensure bid is in correct increment
    const increase = amount - status.amount;
    if (increase % minIncrease !== 0) {
      setFeedback(`Bid must be in increments of ${formatMoney(activeItem.currency, minIncrease)}`);
      setValid("is-invalid");
      setIsSubmitting(false);
      return;
    }
    // Finally, place bid
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
        {isEnded ? (
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
