import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { ModalTypes } from "../utils/modalTypes";
import { ModalsContext } from "./ModalsContext";

export const ModalsProvider = ({ children }) => {
  const [activeItem, setActiveItem] = useState({});
  const [currentModal, setCurrentModal] = useState(ModalTypes.NONE);
  const [signedInUser, setSignedInUser] = useState(null);

  useEffect(() => {
    if (currentModal !== ModalTypes.NONE) {
      document.body.classList.add("modal-active");
    } else {
      document.body.classList.remove("modal-active");
    }
    return () => document.body.classList.remove("modal-active");
  }, [currentModal]);

  const openModal = (modalType, item = {}) => {
    setActiveItem(item);
    setCurrentModal(modalType);
  };

  const closeModal = () => {
    setCurrentModal(ModalTypes.NONE);
    setActiveItem({});
  };

  return (
    <ModalsContext.Provider
      value={{ activeItem, currentModal, openModal, closeModal, signedInUser, setSignedInUser }}
    >
      {children}
    </ModalsContext.Provider>
  );
};

ModalsProvider.propTypes = {
  children: PropTypes.arrayOf(PropTypes.element)
}
